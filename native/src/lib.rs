use calamine::{open_workbook_auto, Data, Reader};
use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{BufReader, BufWriter, Read, Write};
use std::path::{Path, PathBuf};
use zip::write::FileOptions;
use zip::{ZipArchive, ZipWriter};
use walkdir::WalkDir;

// ──────────────────────────────────────────────
// Excel utilities (existantes — inchangées)
// ──────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct ExcelSheetPreview {
    pub sheet_names: Vec<String>,
    pub active_sheet: String,
    pub rows: Vec<Vec<String>>,
    pub total_rows: u32,
}

fn data_to_string(data: &Data) -> String {
    match data {
        Data::Empty => String::new(),
        Data::String(s) => s.trim().to_string(),
        Data::Float(f) => {
            if f.fract() == 0.0 && f.abs() < 1e15 {
                format!("{:.0}", f)
            } else {
                format!("{}", f)
            }
        }
        Data::Int(i) => format!("{}", i),
        Data::Bool(b) => (if *b { "true" } else { "false" }).to_string(),
        Data::DateTime(dt) => format!("{}", dt),
        Data::DateTimeIso(s) => s.clone(),
        Data::DurationIso(s) => s.clone(),
        Data::Error(e) => format!("ERR:{:?}", e),
    }
}

/// Prévisualise rapidement un fichier Excel / CSV (.xlsx, .xls, .xlsb, .ods)
#[napi]
pub fn fast_preview_excel(
    file_path: String,
    sheet_name: Option<String>,
    max_rows: Option<u32>,
) -> Result<ExcelSheetPreview> {
    let mut workbook = open_workbook_auto(&file_path)
        .map_err(|e| Error::new(Status::GenericFailure, format!("Erreur ouverture classeur : {}", e)))?;

    let sheet_names = workbook.sheet_names().to_vec();
    if sheet_names.is_empty() {
        return Err(Error::new(Status::GenericFailure, "Le classeur ne contient aucune feuille."));
    }

    let active_sheet = match sheet_name {
        Some(ref name) if sheet_names.contains(name) => name.clone(),
        _ => sheet_names[0].clone(),
    };

    let range = workbook
        .worksheet_range(&active_sheet)
        .map_err(|e| Error::new(Status::GenericFailure, format!("Erreur lecture feuille : {}", e)))?;

    let total_rows = range.height() as u32;
    let limit = max_rows.unwrap_or(50) as usize;

    let mut rows: Vec<Vec<String>> = Vec::new();
    for (i, row) in range.rows().enumerate() {
        if i >= limit {
            break;
        }
        let row_vec: Vec<String> = row.iter().map(data_to_string).collect();
        rows.push(row_vec);
    }

    Ok(ExcelSheetPreview {
        sheet_names,
        active_sheet,
        rows,
        total_rows,
    })
}

/// Lit TOUTES les lignes d'une feuille Excel à vitesse native Rust
#[napi]
pub fn fast_read_all_rows(file_path: String, sheet_name: Option<String>) -> Result<Vec<Vec<String>>> {
    let mut workbook = open_workbook_auto(&file_path)
        .map_err(|e| Error::new(Status::GenericFailure, format!("Erreur ouverture classeur : {}", e)))?;

    let sheet_names = workbook.sheet_names().to_vec();
    if sheet_names.is_empty() {
        return Err(Error::new(Status::GenericFailure, "Le classeur ne contient aucune feuille."));
    }

    let active_sheet = match sheet_name {
        Some(ref name) if sheet_names.contains(name) => name.clone(),
        _ => sheet_names[0].clone(),
    };

    let range = workbook
        .worksheet_range(&active_sheet)
        .map_err(|e| Error::new(Status::GenericFailure, format!("Erreur lecture feuille : {}", e)))?;

    let mut rows: Vec<Vec<String>> = Vec::with_capacity(range.height());
    for row in range.rows() {
        let row_vec: Vec<String> = row.iter().map(data_to_string).collect();
        rows.push(row_vec);
    }

    Ok(rows)
}

// ──────────────────────────────────────────────
// Module Import / Export données Iventello (.iventello)
// ──────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct ExportResult {
    pub output_path: String,
    pub size_bytes: i64,
    pub files_count: i32,
}

#[derive(Serialize, Deserialize)]
pub struct ImportResult {
    pub data_json: String,  // JSON extrait de data.json dans le zip
    pub has_images: bool,
    pub images_extracted: i32,
    pub db_included: bool,
}

/// Exporte toutes les données Iventello dans une archive .iventello (ZIP)
/// 
/// # Arguments
/// - `data_json_path` : chemin vers le fichier JSON exporté par Node (produits, ventes, etc.)
/// - `user_data_dir`  : chemin vers le dossier userData Electron (pour trouver les images)
/// - `output_path`    : chemin de destination du fichier .iventello
/// - `db_path`        : chemin vers database.db (inclus dans l'archive)
#[napi]
pub fn create_iventello_archive(
    data_json_path: String,
    user_data_dir: String,
    db_path: String,
    output_path: String,
) -> Result<ExportResult> {
    let out_file = File::create(&output_path)
        .map_err(|e| Error::new(Status::GenericFailure, format!("Impossible de créer l'archive : {}", e)))?;
    let writer = BufWriter::new(out_file);
    let mut zip = ZipWriter::new(writer);

    let options: FileOptions<()> = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    let mut files_count = 0i32;

    // 1. data.json (export JSON de la DB)
    if Path::new(&data_json_path).exists() {
        let json_bytes = fs::read(&data_json_path)
            .map_err(|e| Error::new(Status::GenericFailure, format!("Lecture data.json : {}", e)))?;
        zip.start_file("data.json", options)
            .map_err(|e| Error::new(Status::GenericFailure, format!("ZIP data.json : {}", e)))?;
        zip.write_all(&json_bytes)
            .map_err(|e| Error::new(Status::GenericFailure, format!("Écriture data.json : {}", e)))?;
        files_count += 1;
    }

    // 2. database.db (copie brute de la SQLite)
    if Path::new(&db_path).exists() {
        let db_bytes = fs::read(&db_path)
            .map_err(|e| Error::new(Status::GenericFailure, format!("Lecture database.db : {}", e)))?;
        zip.start_file("database.db", options)
            .map_err(|e| Error::new(Status::GenericFailure, format!("ZIP database.db : {}", e)))?;
        zip.write_all(&db_bytes)
            .map_err(|e| Error::new(Status::GenericFailure, format!("Écriture database.db : {}", e)))?;
        files_count += 1;
    }

    // 3. Images — parcourir userData/uploads/ et userData/logos/ récursivement
    let image_dirs = ["uploads", "logos", "images", "product-images", "book-images", "warehouse-logos"];
    for dir_name in &image_dirs {
        let img_dir = PathBuf::from(&user_data_dir).join(dir_name);
        if !img_dir.exists() {
            continue;
        }
        for entry in WalkDir::new(&img_dir).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            // Extension image seulement
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
            if !["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"].contains(&ext.as_str()) {
                continue;
            }
            let rel = path.strip_prefix(&user_data_dir).unwrap_or(path);
            let zip_path = format!("assets/{}", rel.to_string_lossy().replace('\\', "/"));

            match fs::read(path) {
                Ok(bytes) => {
                    if zip.start_file(&zip_path, options).is_ok() {
                        let _ = zip.write_all(&bytes);
                        files_count += 1;
                    }
                }
                Err(_) => continue,
            }
        }
    }

    // 4. manifest.json
    let manifest = serde_json::json!({
        "version": "1.0",
        "app": "iventello",
        "created_at": chrono::Utc::now().to_rfc3339(),
        "files_count": files_count
    });
    let manifest_bytes = serde_json::to_vec_pretty(&manifest)
        .map_err(|e| Error::new(Status::GenericFailure, format!("Sérialisation manifest : {}", e)))?;
    zip.start_file("manifest.json", options)
        .map_err(|e| Error::new(Status::GenericFailure, format!("ZIP manifest.json : {}", e)))?;
    zip.write_all(&manifest_bytes)
        .map_err(|e| Error::new(Status::GenericFailure, format!("Écriture manifest.json : {}", e)))?;
    files_count += 1;

    zip.finish()
        .map_err(|e| Error::new(Status::GenericFailure, format!("Finalisation ZIP : {}", e)))?;

    let size_bytes = fs::metadata(&output_path)
        .map(|m| m.len() as i64)
        .unwrap_or(0);

    Ok(ExportResult {
        output_path,
        size_bytes,
        files_count,
    })
}

/// Extrait une archive .iventello et retourne son contenu JSON + images
///
/// # Arguments
/// - `archive_path`   : chemin vers le fichier .iventello à importer
/// - `extract_dir`    : dossier de destination pour les images extraites (userData)
/// - `restore_db`     : si true, copie database.db dans `extract_dir/database_import.db`
#[napi]
pub fn extract_iventello_archive(
    archive_path: String,
    extract_dir: String,
    restore_db: bool,
) -> Result<ImportResult> {
    let file = File::open(&archive_path)
        .map_err(|e| Error::new(Status::GenericFailure, format!("Impossible d'ouvrir l'archive : {}", e)))?;
    let reader = BufReader::new(file);
    let mut archive = ZipArchive::new(reader)
        .map_err(|e| Error::new(Status::GenericFailure, format!("Archive invalide : {}", e)))?;

    let mut data_json = String::new();
    let mut images_extracted = 0i32;
    let mut db_included = false;

    for i in 0..archive.len() {
        let mut zip_file = archive.by_index(i)
            .map_err(|e| Error::new(Status::GenericFailure, format!("Entrée ZIP {} : {}", i, e)))?;

        let name = zip_file.name().to_string();

        if name == "data.json" {
            zip_file.read_to_string(&mut data_json)
                .map_err(|e| Error::new(Status::GenericFailure, format!("Lecture data.json : {}", e)))?;
        } else if name == "database.db" {
            db_included = true;
            if restore_db {
                let dest = PathBuf::from(&extract_dir).join("database_import.db");
                if let Some(parent) = dest.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                let mut out = File::create(&dest)
                    .map_err(|e| Error::new(Status::GenericFailure, format!("Création database_import.db : {}", e)))?;
                let mut buf = Vec::new();
                zip_file.read_to_end(&mut buf)
                    .map_err(|e| Error::new(Status::GenericFailure, format!("Lecture database.db : {}", e)))?;
                out.write_all(&buf)
                    .map_err(|e| Error::new(Status::GenericFailure, format!("Écriture database_import.db : {}", e)))?;
            }
        } else if name.starts_with("assets/") && !name.ends_with('/') {
            // Extraire les images
            let rel = name.trim_start_matches("assets/");
            let dest = PathBuf::from(&extract_dir).join(rel);
            if let Some(parent) = dest.parent() {
                let _ = fs::create_dir_all(parent);
            }
            let mut buf = Vec::new();
            if zip_file.read_to_end(&mut buf).is_ok() {
                if let Ok(mut out) = File::create(&dest) {
                    if out.write_all(&buf).is_ok() {
                        images_extracted += 1;
                    }
                }
            }
        }
        // manifest.json — ignoré (métadonnées uniquement)
    }

    Ok(ImportResult {
        data_json,
        has_images: images_extracted > 0,
        images_extracted,
        db_included,
    })
}

// ──────────────────────────────────────────────
// Module Bons de Commande & Tableaux Haute Précision
// ──────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct RustPurchaseOrderItem {
    pub product_id: String,
    pub product_name: String,
    pub product_barcode: String,
    pub current_stock: i32,
    pub alert_limit: i32,
    pub quantity: i32,
    pub unit_price: f64,
    pub warehouse_name: String,
}

#[derive(Serialize, Deserialize)]
pub struct RustPurchaseOrderSummary {
    pub total_items: i32,
    pub total_quantity: i32,
    pub total_amount: f64,
    pub critical_count: i32,
}

/// Calcule rapidement les totaux et statistiques de bon de commande à vitesse native
#[napi]
pub fn calculate_purchase_order_totals(items_json: String) -> Result<String> {
    let items: Vec<RustPurchaseOrderItem> = serde_json::from_str(&items_json)
        .map_err(|e| Error::new(Status::GenericFailure, format!("JSON invalide : {}", e)))?;

    let mut total_quantity = 0i32;
    let mut total_amount = 0.0f64;
    let mut critical_count = 0i32;

    for item in &items {
        total_quantity += item.quantity;
        total_amount += (item.quantity as f64) * item.unit_price;
        if item.current_stock <= item.alert_limit {
            critical_count += 1;
        }
    }

    let summary = RustPurchaseOrderSummary {
        total_items: items.len() as i32,
        total_quantity,
        total_amount,
        critical_count,
    };

    serde_json::to_string(&summary)
        .map_err(|e| Error::new(Status::GenericFailure, format!("Erreur sérialisation : {}", e)))
}

/// Formate un bon de commande en CSV tabulaire UTF-8 avec BOM pour compatibilité Excel totale
#[napi]
pub fn format_purchase_order_tabular_csv(
    supplier_name: String,
    warehouse_name: String,
    items_json: String,
    output_path: String,
) -> Result<String> {
    let items: Vec<RustPurchaseOrderItem> = serde_json::from_str(&items_json)
        .map_err(|e| Error::new(Status::GenericFailure, format!("JSON invalide : {}", e)))?;

    let mut csv_content = String::new();
    // BOM UTF-8 pour ouverture parfaite dans Microsoft Excel
    csv_content.push('\u{FEFF}');

    // En-tête
    csv_content.push_str(&format!("\"BON DE COMMANDE FOURNISSEUR — {}\"\n", supplier_name.replace('"', "\"\"")));
    csv_content.push_str(&format!("\"Entrepôt destinataire : {}\"\n", warehouse_name.replace('"', "\"\"")));
    csv_content.push_str(&format!("\"Date d'émission : {}\"\n\n", chrono::Local::now().format("%d/%m/%Y %H:%M")));

    // Tableau
    csv_content.push_str("\"#\";\"Désignation Produit\";\"Code-barres\";\"Stock Actuel\";\"Seuil Alerte\";\"Qté Commandée\";\"Prix Unitaire (FCFA)\";\"Sous-total (FCFA)\";\"Entrepôt\"\n");

    let mut total_qty = 0i32;
    let mut total_amount = 0.0f64;

    for (i, item) in items.iter().enumerate() {
        let subtotal = (item.quantity as f64) * item.unit_price;
        total_qty += item.quantity;
        total_amount += subtotal;

        csv_content.push_str(&format!(
            "{};\"{}\";\"{}\";{};{};{};{:.0};{:.0};\"{}\"\n",
            i + 1,
            item.product_name.replace('"', "\"\""),
            item.product_barcode.replace('"', "\"\""),
            item.current_stock,
            item.alert_limit,
            item.quantity,
            item.unit_price,
            subtotal,
            item.warehouse_name.replace('"', "\"\"")
        ));
    }

    csv_content.push_str(&format!(
        "\n\"\";\"TOTAL GÉNÉRAL\";\"\";\"\";\"\";{};\"\";{:.0};\"\"\n",
        total_qty, total_amount
    ));

    fs::write(&output_path, csv_content.as_bytes())
        .map_err(|e| Error::new(Status::GenericFailure, format!("Écriture fichier CSV : {}", e)))?;

    Ok(output_path)
}

