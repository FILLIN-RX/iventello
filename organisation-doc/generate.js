const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Header, Footer, VerticalAlign
} = require('docx');
const fs = require('fs');

const C = {
  primary: "1A3C6B", secondary: "2E75B6",
  dev1: "1A3C6B", dev1bg: "E8F0FE",
  dev2: "6A1B9A", dev2bg: "F3E5F5",
  dev3: "00695C", dev3bg: "E0F2F1",
  red: "C62828", redbg: "FFEBEE",
  orange: "E65100", orangebg: "FFF3E0",
  gray: "757575", lightgray: "F5F5F5",
  white: "FFFFFF", dark: "212121",
  border: "BDBDBD", green: "2E7D32", greenbg: "E8F5E9",
  code: "1A1A2E", purple: "4A148C", teal: "004D40",
};

const b  = (color = C.border) => ({ style: BorderStyle.SINGLE, size: 1, color });
const bs = (color = C.border) => ({ top: b(color), bottom: b(color), left: b(color), right: b(color) });
const nb  = () => ({ style: BorderStyle.NONE, size: 0, color: C.white });
const nbs = () => ({ top: nb(), bottom: nb(), left: nb(), right: nb() });

const mkCell = (text, bg, w, bold = false, color = C.dark, mono = false) =>
  new TableCell({
    borders: bs(C.border),
    shading: { fill: bg, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    width: { size: w, type: WidthType.DXA },
    children: [new Paragraph({
      children: [new TextRun({ text, font: mono ? "Courier New" : "Arial", size: 18, bold, color })]
    })]
  });

const hCell = (text, bg, w) => mkCell(text, bg, w, true, C.white);

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.secondary, space: 4 } },
    children: [new TextRun({ text, bold: true, color: C.primary, size: 28, font: "Arial" })]
  });
}
function h2(text, color = C.secondary) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, color, size: 24, font: "Arial" })]
  });
}
function h3(text, color = C.dark) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, color, size: 22, font: "Arial" })]
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: C.dark, ...opts })]
  });
}
function bul(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Arial", size: 20 })]
  });
}
function chk(text) {
  return new Paragraph({
    numbering: { reference: "checks", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Arial", size: 20 })]
  });
}
function sp(n = 1) {
  return new Paragraph({ spacing: { before: 0, after: n * 80 }, children: [new TextRun("")] });
}

function codeBlock(lines, borderColor = C.secondary) {
  const lineColor = (line) => {
    if (line.startsWith("#") || line.startsWith("//")) return "6A9955";
    if (/^(git |flutter |dart )/.test(line)) return "4FC3F7";
    if (line.startsWith("import")) return "C586C0";
    if (/^(class |sealed |final class |abstract )/.test(line) || line === "}") return "4EC9B0";
    if (line.startsWith("  ") && line.includes(":") && !line.includes("//")) return "9CDCFE";
    return "FFFFFF";
  };
  return new Table({
    width: { size: 9506, type: WidthType.DXA }, columnWidths: [9506],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: b(borderColor), bottom: b(borderColor), left: { style: BorderStyle.SINGLE, size: 12, color: borderColor }, right: b(borderColor) },
      shading: { fill: C.code, type: ShadingType.CLEAR },
      margins: { top: 140, bottom: 140, left: 200, right: 200 },
      children: lines.map(line => new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: line, font: "Courier New", size: 16, color: lineColor(line) })]
      }))
    })] })]
  });
}

function devBanner(name, role, branche, devColor, devBg) {
  return new Table({
    width: { size: 9506, type: WidthType.DXA }, columnWidths: [320, 9186],
    rows: [new TableRow({ children: [
      new TableCell({ borders: nbs(), shading: { fill: devColor, type: ShadingType.CLEAR }, margins: { top: 0, bottom: 0, left: 0, right: 0 }, children: [new Paragraph({ children: [new TextRun("")] })] }),
      new TableCell({
        borders: { top: b(devColor), bottom: b(devColor), left: nb(), right: b(devColor) },
        shading: { fill: devBg, type: ShadingType.CLEAR },
        margins: { top: 140, bottom: 140, left: 220, right: 220 },
        children: [
          new Paragraph({ children: [new TextRun({ text: name, font: "Arial", size: 26, bold: true, color: devColor })] }),
          new Paragraph({ spacing: { before: 36 }, children: [new TextRun({ text: `Specialite : ${role}`, font: "Arial", size: 20, color: C.gray })] }),
          new Paragraph({ spacing: { before: 28 }, children: [
            new TextRun({ text: "Branche : ", font: "Arial", size: 19, color: C.dark }),
            new TextRun({ text: branche, font: "Courier New", size: 19, bold: true, color: devColor }),
          ]}),
        ]
      })
    ]})]
  });
}

function tbl(headers, rows, colWidths, headerBg = C.primary) {
  return new Table({
    width: { size: 9506, type: WidthType.DXA }, columnWidths: colWidths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => hCell(h, headerBg, colWidths[i])) }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((txt, i) => {
          let bg = ri % 2 === 0 ? C.white : C.lightgray;
          let color = C.dark; let bold = false;
          if (txt === "A faire") { bg = "FFF9C4"; color = "F57F17"; bold = true; }
          if (txt.startsWith("P0")) { bg = C.redbg; color = C.red; bold = true; }
          if (txt.startsWith("P1")) { bg = C.orangebg; color = C.orange; bold = true; }
          return mkCell(txt, bg, colWidths[i], bold, color);
        })
      }))
    ]
  });
}

function banner(text, bg, textColor = C.white) {
  return new Table({
    width: { size: 9506, type: WidthType.DXA }, columnWidths: [9506],
    rows: [new TableRow({ children: [new TableCell({
      borders: nbs(), shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 240, right: 240 },
      children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, bold: true, color: textColor })] })]
    })] })]
  });
}

// helper: 2-col info row
function infoRow(label, value, devColor = C.secondary) {
  return new Table({
    width: { size: 9506, type: WidthType.DXA }, columnWidths: [2400, 7106],
    rows: [new TableRow({ children: [
      new TableCell({ borders: bs(devColor), shading: { fill: devColor, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: label, font: "Arial", size: 18, bold: true, color: C.white })] })] }),
      new TableCell({ borders: bs(devColor), shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: value, font: "Arial", size: 18, color: C.dark })] })] }),
    ]})]
  });
}

// ════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "checks",  levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2610", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 20, color: C.dark } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: "Arial", color: C.primary }, paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: "Arial", color: C.secondary }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, font: "Arial", color: C.dark }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } } },
    headers: {
      default: new Header({ children: [new Table({
        width: { size: 9506, type: WidthType.DXA }, columnWidths: [7000, 2506],
        rows: [new TableRow({ children: [
          new TableCell({ borders: { top: nb(), left: nb(), right: nb(), bottom: b(C.secondary) }, margins: { top: 60, bottom: 60, left: 0, right: 0 }, children: [new Paragraph({ children: [new TextRun({ text: "Application Jetons NFC & Bluetooth", font: "Arial", size: 18, bold: true, color: C.primary })] })] }),
          new TableCell({ borders: { top: nb(), left: nb(), right: nb(), bottom: b(C.secondary) }, margins: { top: 60, bottom: 60, left: 0, right: 0 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Clean Architecture  |  Feature First  |  v3", font: "Arial", size: 18, color: C.gray })] })] }),
        ]})]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.secondary, space: 4 } },
        children: [
          new TextRun({ text: "Usage Interne | Page ", font: "Arial", size: 16, color: C.gray }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: C.gray }),
          new TextRun({ text: " / ", font: "Arial", size: 16, color: C.gray }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 16, color: C.gray }),
        ]
      })] })
    },

    children: [

      // ══ PAGE DE GARDE ═══════════════════════════════════════════════════
      sp(2),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "APPLICATION JETONS NFC & BLUETOOTH", font: "Arial", size: 40, bold: true, color: C.primary })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: "PLAN D'ORGANISATION DU TRAVAIL", font: "Arial", size: 26, color: C.secondary })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: "Clean Architecture  |  Feature-First  |  3 Developpeurs", font: "Arial", size: 20, color: C.gray })] }),
      sp(1),

      // carte recap equipe
      new Table({
        width: { size: 9506, type: WidthType.DXA }, columnWidths: [3168, 3170, 3168],
        rows: [new TableRow({ children: [
          new TableCell({ borders: bs(C.dev1), shading: { fill: C.dev1bg, type: ShadingType.CLEAR }, margins: { top: 160, bottom: 160, left: 160, right: 160 }, children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DEV 1", font: "Arial", size: 22, bold: true, color: C.dev1 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: "feature/token-creation", font: "Courier New", size: 16, color: C.dev1 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: "Core + Creation Jeton", font: "Arial", size: 18, color: C.dark })] }),
          ]}),
          new TableCell({ borders: bs(C.dev2), shading: { fill: C.dev2bg, type: ShadingType.CLEAR }, margins: { top: 160, bottom: 160, left: 160, right: 160 }, children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DEV 2", font: "Arial", size: 22, bold: true, color: C.dev2 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: "feature/transfer", font: "Courier New", size: 16, color: C.dev2 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: "NFC + Bluetooth", font: "Arial", size: 18, color: C.dark })] }),
          ]}),
          new TableCell({ borders: bs(C.dev3), shading: { fill: C.dev3bg, type: ShadingType.CLEAR }, margins: { top: 160, bottom: 160, left: 160, right: 160 }, children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DEV 3", font: "Arial", size: 22, bold: true, color: C.dev3 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: "feature/security-history", font: "Courier New", size: 16, color: C.dev3 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: "Securite + Historique", font: "Arial", size: 18, color: C.dark })] }),
          ]}),
        ]})]
      }),
      sp(2),

      // ══ SECTION 1 : CLEAN ARCHITECTURE ══════════════════════════════════
      h1("1. Clean Architecture Feature-First — Principes"),
      p("La Clean Architecture organise le code en couches concentriques independantes. La regle fondamentale : les dependances ne pointent que vers l'interieur. L'approche Feature-First regroupe toutes les couches d'une meme fonctionnalite dans un seul dossier, plutot que de grouper par couche technique."),
      sp(1),

      h2("1.1 Les 4 couches de la Clean Architecture"),
      tbl(
        ["Couche", "Role", "Contenu concret", "Dependances"],
        [
          ["Presentation", "Affichage & interaction", "Screens, Widgets, ViewModels (Riverpod providers)", "Domain uniquement"],
          ["Domain", "Logique metier pure", "Entities, Use Cases, Repository interfaces (abstraits)", "Aucune (pur Dart)"],
          ["Data", "Acces aux donnees", "Repository implementations, Data Sources, DTOs, Mappers", "Domain uniquement"],
          ["Core / Shared", "Utilitaires transversaux", "Errors, Extensions, Constants, Theme, Router", "Aucune"],
        ],
        [2000, 2200, 3000, 2306], C.primary
      ),
      sp(1),

      h2("1.2 Regles d'or a respecter"),
      bul("La couche Domain ne connait pas Flutter : pur Dart, zero import flutter/material.dart"),
      bul("Les Use Cases contiennent UNE seule responsabilite (ex: CreateTokenUseCase, SendNfcUseCase)"),
      bul("Les Repository interfaces sont definies dans Domain, implementees dans Data"),
      bul("Les Entities (Domain) ne dependent jamais des Models SQLite ou DTOs (Data)"),
      bul("Les Mappers convertissent : Entity <-> DTO <-> Model base de donnees"),
      bul("La Presentation ne touche jamais directement la base de donnees ou les services NFC/BT"),
      bul("Chaque feature est un module autonome avec ses 4 couches internes"),
      sp(2),

      // ══ SECTION 2 : STRUCTURE GLOBALE ════════════════════════════════════
      h1("2. Structure Projet Feature-First"),
      p("Chaque feature contient ses propres couches domain, data et presentation. Le dossier core contient uniquement ce qui est partage entre toutes les features."),
      sp(1),
      codeBlock([
        "lib/",
        "├── core/                              # Partage entre toutes les features",
        "│   ├── error/",
        "│   │   ├── failures.dart              # Failure, NetworkFailure, ValidationFailure...",
        "│   │   └── exceptions.dart            # AppException, NFCException, BTException...",
        "│   ├── usecases/",
        "│   │   └── usecase.dart               # interface abstraite UseCase<Type, Params>",
        "│   ├── utils/",
        "│   │   ├── app_logger.dart            # Logger unifie par tag",
        "│   │   ├── result.dart                # Result<T> = Success | Failure",
        "│   │   ├── crypto_helper.dart         # sha256(), hmac(), generateNonce()",
        "│   │   ├── date_extensions.dart       # isExpired, formatted...",
        "│   │   └── permission_helper.dart     # NFC + Bluetooth permissions",
        "│   ├── constants/",
        "│   │   ├── app_constants.dart         # Timeouts, retry max, version protocole",
        "│   │   └── app_strings.dart           # Tous les textes UI centralises",
        "│   ├── router/",
        "│   │   └── app_router.dart            # go_router : routes de toutes les features",
        "│   ├── theme/",
        "│   │   └── app_theme.dart             # ThemeData light / dark",
        "│   └── widgets/                       # Widgets globaux reutilisables",
        "│       ├── token_card.dart            # Carte affichage d'un jeton",
        "│       ├── status_badge.dart          # Badge statut (actif/transfere/expire)",
        "│       └── loading_overlay.dart       # Overlay de chargement",
        "│",
        "├── features/",
        "│   ├── token_creation/                # [DEV 1] Feature creation de jeton",
        "│   │   ├── domain/",
        "│   │   │   ├── entities/",
        "│   │   │   │   └── token.dart         # Entity Token (pur Dart, pas Freezed ici)",
        "│   │   │   ├── repositories/",
        "│   │   │   │   └── token_repository.dart  # interface abstraite",
        "│   │   │   └── usecases/",
        "│   │   │       ├── create_token_usecase.dart",
        "│   │   │       ├── get_all_tokens_usecase.dart",
        "│   │   │       └── delete_token_usecase.dart",
        "│   │   ├── data/",
        "│   │   │   ├── datasources/",
        "│   │   │   │   ├── token_local_datasource.dart   # SQLite + Hive",
        "│   │   │   │   └── token_local_datasource_impl.dart",
        "│   │   │   ├── models/",
        "│   │   │   │   └── token_model.dart   # DTO SQLite (Freezed + json_serializable)",
        "│   │   │   ├── mappers/",
        "│   │   │   │   └── token_mapper.dart  # TokenModel <-> Token entity",
        "│   │   │   └── repositories/",
        "│   │   │       └── token_repository_impl.dart",
        "│   │   └── presentation/",
        "│   │       ├── providers/",
        "│   │       │   └── token_creation_provider.dart  # Riverpod",
        "│   │       ├── screens/",
        "│   │       │   └── create_token_screen.dart",
        "│   │       └── widgets/",
        "│   │           └── token_form.dart",
        "│   │",
        "│   ├── transfer/                      # [DEV 2] Feature transfert NFC & BT",
        "│   │   ├── domain/",
        "│   │   │   ├── entities/",
        "│   │   │   │   └── transfer_result.dart",
        "│   │   │   ├── repositories/",
        "│   │   │   │   ├── nfc_repository.dart",
        "│   │   │   │   └── bluetooth_repository.dart",
        "│   │   │   └── usecases/",
        "│   │   │       ├── send_token_nfc_usecase.dart",
        "│   │   │       ├── receive_token_nfc_usecase.dart",
        "│   │   │       ├── send_token_bluetooth_usecase.dart",
        "│   │   │       └── receive_token_bluetooth_usecase.dart",
        "│   │   ├── data/",
        "│   │   │   ├── datasources/",
        "│   │   │   │   ├── nfc_datasource.dart",
        "│   │   │   │   └── bluetooth_datasource.dart",
        "│   │   │   ├── models/",
        "│   │   │   │   └── transfer_payload_model.dart  # JSON encode/decode",
        "│   │   │   ├── mappers/",
        "│   │   │   │   └── token_payload_mapper.dart",
        "│   │   │   └── repositories/",
        "│   │   │       ├── nfc_repository_impl.dart",
        "│   │   │       └── bluetooth_repository_impl.dart",
        "│   │   └── presentation/",
        "│   │       ├── providers/",
        "│   │       │   └── transfer_provider.dart",
        "│   │       ├── screens/",
        "│   │       │   └── transfer_screen.dart",
        "│   │       └── widgets/",
        "│   │           ├── nfc_scan_animation.dart",
        "│   │           └── bluetooth_device_list.dart",
        "│   │",
        "│   └── security_history/              # [DEV 3] Feature securite + historique",
        "│       ├── domain/",
        "│       │   ├── entities/",
        "│       │   │   ├── transaction.dart",
        "│       │   │   └── token_signature.dart",
        "│       │   ├── repositories/",
        "│       │   │   ├── security_repository.dart",
        "│       │   │   └── history_repository.dart",
        "│       │   └── usecases/",
        "│       │       ├── sign_token_usecase.dart",
        "│       │       ├── verify_token_usecase.dart",
        "│       │       ├── save_transaction_usecase.dart",
        "│       │       └── get_history_usecase.dart",
        "│       ├── data/",
        "│       │   ├── datasources/",
        "│       │   │   ├── security_datasource.dart",
        "│       │   │   └── history_local_datasource.dart",
        "│       │   ├── models/",
        "│       │   │   └── transaction_model.dart",
        "│       │   ├── mappers/",
        "│       │   │   └── transaction_mapper.dart",
        "│       │   └── repositories/",
        "│       │       ├── security_repository_impl.dart",
        "│       │       └── history_repository_impl.dart",
        "│       └── presentation/",
        "│           ├── providers/",
        "│           │   └── history_provider.dart",
        "│           ├── screens/",
        "│           │   └── history_screen.dart",
        "│           └── widgets/",
        "│               └── transaction_tile.dart",
        "│",
        "└── main.dart                          # Injection dependances + ProviderScope",
        "",
        "test/",
        "├── features/",
        "│   ├── token_creation/                # Tests unitaires Dev 1",
        "│   ├── transfer/                      # Tests unitaires Dev 2",
        "│   └── security_history/              # Tests unitaires Dev 3",
        "└── integration_test/",
        "    └── app_test.dart                  # Tests integration (tous)",
      ], C.secondary),
      sp(2),

      // ══ SECTION 3 : PACKAGES ═════════════════════════════════════════════
      h1("3. Packages & Dependances"),
      p("Ajoutes par Dev 1 lors du setup initial. Tous les developpeurs utilisent ces dependances."),
      sp(1),
      h2("3.1 dependencies"),
      tbl(
        ["Package", "Version", "Usage dans la Clean Archi", "Priorite"],
        [
          ["flutter_riverpod", "^2.4.9", "Providers Presentation layer (ViewModels)", "P0 - BLOQUANT"],
          ["riverpod_annotation", "^2.3.3", "Annotations @riverpod sur les providers", "P0 - BLOQUANT"],
          ["get_it", "^7.6.7", "Injection de dependances (DI) dans main.dart", "P0 - BLOQUANT"],
          ["injectable", "^2.3.2", "Annotations @injectable + @lazySingleton", "P0 - BLOQUANT"],
          ["sqflite", "^2.3.0", "Data layer : datasource SQLite local", "P0 - BLOQUANT"],
          ["hive + hive_flutter", "^2.2.3", "Data layer : cache cle-valeur rapide", "P0 - BLOQUANT"],
          ["freezed_annotation", "^2.4.1", "Data layer : models DTO immutables", "P0 - BLOQUANT"],
          ["json_annotation", "^4.8.1", "Data layer : serialisation JSON des DTOs", "P0 - BLOQUANT"],
          ["uuid", "^4.3.3", "Domain layer : generation UUID entity Token", "P1 - CRITIQUE"],
          ["crypto", "^3.0.3", "Core : SHA-256 / HMAC dans CryptoHelper", "P1 - CRITIQUE"],
          ["nfc_manager", "^3.3.0", "Data layer : datasource NFC", "P1 - CRITIQUE"],
          ["flutter_blue_plus", "^1.29.5", "Data layer : datasource Bluetooth BLE", "P1 - CRITIQUE"],
          ["permission_handler", "^11.3.0", "Core : PermissionHelper NFC + BT", "P1 - CRITIQUE"],
          ["go_router", "^13.2.0", "Core router : navigation entre features", "P1 - CRITIQUE"],
          ["dartz", "^0.10.1", "Domain layer : Either<Failure, T> pour les Use Cases", "P1 - CRITIQUE"],
          ["equatable", "^2.0.5", "Domain layer : Entities comparables (==)", "P2 - MOYENNE"],
          ["intl", "^0.19.0", "Presentation : formatage dates et montants", "P2 - MOYENNE"],
          ["connectivity_plus", "^6.0.3", "Core : detection etat connexion", "P2 - MOYENNE"],
        ],
        [2600, 1500, 3400, 2006], C.primary
      ),
      sp(1),
      h2("3.2 dev_dependencies"),
      tbl(
        ["Package", "Version", "Role"],
        [
          ["build_runner", "^2.4.8", "Generateur de code (freezed, json, riverpod, injectable)"],
          ["riverpod_generator", "^2.3.9", "Auto-generation des providers Riverpod"],
          ["freezed", "^2.4.6", "Generation code des DTOs immutables"],
          ["json_serializable", "^6.7.1", "Generation code de serialisation JSON"],
          ["hive_generator", "^2.0.1", "Generation des adaptateurs Hive"],
          ["injectable_generator", "^2.4.1", "Generation du code d'injection de dependances"],
          ["mockito", "^5.4.4", "Mocks des repositories pour les tests Use Cases"],
          ["flutter_test", "sdk: flutter", "Framework de tests Flutter"],
        ],
        [3000, 1700, 4806], C.primary
      ),
      sp(1),

      h2("3.3 Note sur get_it + injectable (Injection de Dependances)"),
      p("Dans la Clean Architecture, les implementations concretes (Data layer) sont injectees dans les Use Cases (Domain) via le conteneur DI. Cela permet de tester les Use Cases avec de faux repositories (mocks) sans toucher a SQLite ou NFC."),
      sp(1),
      codeBlock([
        "// lib/main.dart",
        "import 'package:get_it/get_it.dart';",
        "import 'injection_container.dart';",
        "",
        "void main() async {",
        "  WidgetsFlutterBinding.ensureInitialized();",
        "  await configureDependencies();   // enregistre tous les @injectable",
        "  runApp(ProviderScope(child: MyApp()));",
        "}",
        "",
        "// lib/injection_container.dart (genere par injectable_generator)",
        "// Enregistre automatiquement :",
        "//   TokenLocalDatasourceImpl  -> TokenLocalDatasource",
        "//   TokenRepositoryImpl       -> TokenRepository",
        "//   CreateTokenUseCase        -> injection dans le provider",
        "//   SecurityRepositoryImpl    -> SecurityRepository",
        "//   HistoryRepositoryImpl     -> HistoryRepository",
      ], C.secondary),
      sp(2),

      // ══ SECTION 4 : PATTERNS CLEAN ARCHI ════════════════════════════════
      h1("4. Patterns Obligatoires par Couche"),
      sp(1),

      h2("4.1 Entity (Domain) — pur Dart, pas de dependance Flutter"),
      codeBlock([
        "// features/token_creation/domain/entities/token.dart",
        "import 'package:equatable/equatable.dart';",
        "",
        "class Token extends Equatable {",
        "  final String tokenId;",
        "  final String type;",
        "  final double valeur;",
        "  final DateTime dateCreation;",
        "  final String proprietaire;",
        "  final String hash;",
        "  final String signature;",
        "  final TokenStatus statut;",
        "",
        "  const Token({ required this.tokenId, required this.type,",
        "    required this.valeur, required this.dateCreation,",
        "    required this.proprietaire, required this.hash,",
        "    required this.signature, required this.statut });",
        "",
        "  @override",
        "  List<Object?> get props => [tokenId, type, valeur, statut];",
        "}",
        "",
        "enum TokenStatus { actif, transfere, expire }",
      ], C.dev1),
      sp(1),

      h2("4.2 Use Case (Domain) — Either<Failure, T> avec dartz"),
      codeBlock([
        "// features/token_creation/domain/usecases/create_token_usecase.dart",
        "import 'package:dartz/dartz.dart';",
        "import '../../../core/error/failures.dart';",
        "import '../../../core/usecases/usecase.dart';",
        "import '../repositories/token_repository.dart';",
        "import '../entities/token.dart';",
        "",
        "class CreateTokenParams {",
        "  final String type;",
        "  final double valeur;",
        "  final String proprietaire;",
        "  const CreateTokenParams({ required this.type, required this.valeur, required this.proprietaire });",
        "}",
        "",
        "class CreateTokenUseCase implements UseCase<Token, CreateTokenParams> {",
        "  final TokenRepository repository;",
        "  const CreateTokenUseCase(this.repository);",
        "",
        "  @override",
        "  Future<Either<Failure, Token>> call(CreateTokenParams params) async {",
        "    if (params.valeur <= 0) return Left(ValidationFailure('Valeur invalide'));",
        "    if (params.type.isEmpty)  return Left(ValidationFailure('Type manquant'));",
        "    return repository.createToken(params.type, params.valeur, params.proprietaire);",
        "  }",
        "}",
      ], C.dev1),
      sp(1),

      h2("4.3 Repository Interface (Domain) — contrat abstrait"),
      codeBlock([
        "// features/token_creation/domain/repositories/token_repository.dart",
        "import 'package:dartz/dartz.dart';",
        "import '../../../core/error/failures.dart';",
        "import '../entities/token.dart';",
        "",
        "abstract class TokenRepository {",
        "  Future<Either<Failure, Token>> createToken(String type, double valeur, String proprietaire);",
        "  Future<Either<Failure, List<Token>>> getAllTokens();",
        "  Future<Either<Failure, Token>> getTokenById(String id);",
        "  Future<Either<Failure, void>> deleteToken(String id);",
        "}",
      ], C.dev1),
      sp(1),

      h2("4.4 Model DTO (Data) — Freezed + SQLite"),
      codeBlock([
        "// features/token_creation/data/models/token_model.dart",
        "import 'package:freezed_annotation/freezed_annotation.dart';",
        "part 'token_model.freezed.dart';",
        "part 'token_model.g.dart';",
        "",
        "@freezed",
        "class TokenModel with _$TokenModel {",
        "  const factory TokenModel({",
        "    required String tokenId,",
        "    required String type,",
        "    required double valeur,",
        "    required String dateCreation,   // ISO8601 string pour SQLite",
        "    required String proprietaire,",
        "    required String hash,",
        "    required String signature,",
        "    required String statut,         // 'actif' | 'transfere' | 'expire'",
        "  }) = _TokenModel;",
        "",
        "  factory TokenModel.fromJson(Map<String, dynamic> json) => _$TokenModelFromJson(json);",
        "}",
      ], C.dev1),
      sp(1),

      h2("4.5 Mapper (Data) — Entity <-> Model"),
      codeBlock([
        "// features/token_creation/data/mappers/token_mapper.dart",
        "import '../../domain/entities/token.dart';",
        "import '../models/token_model.dart';",
        "",
        "class TokenMapper {",
        "  static Token toEntity(TokenModel model) => Token(",
        "    tokenId: model.tokenId,",
        "    type: model.type,",
        "    valeur: model.valeur,",
        "    dateCreation: DateTime.parse(model.dateCreation),",
        "    proprietaire: model.proprietaire,",
        "    hash: model.hash,",
        "    signature: model.signature,",
        "    statut: TokenStatus.values.byName(model.statut),",
        "  );",
        "",
        "  static TokenModel toModel(Token entity) => TokenModel(",
        "    tokenId: entity.tokenId,",
        "    type: entity.type,",
        "    valeur: entity.valeur,",
        "    dateCreation: entity.dateCreation.toIso8601String(),",
        "    proprietaire: entity.proprietaire,",
        "    hash: entity.hash,",
        "    signature: entity.signature,",
        "    statut: entity.statut.name,",
        "  );",
        "}",
      ], C.dev1),
      sp(1),

      h2("4.6 Provider Riverpod (Presentation) — appel Use Case"),
      codeBlock([
        "// features/token_creation/presentation/providers/token_creation_provider.dart",
        "import 'package:riverpod_annotation/riverpod_annotation.dart';",
        "import 'package:get_it/get_it.dart';",
        "import 'package:dartz/dartz.dart';",
        "import '../../domain/usecases/create_token_usecase.dart';",
        "import '../../domain/entities/token.dart';",
        "part 'token_creation_provider.g.dart';",
        "",
        "@riverpod",
        "class TokenCreationNotifier extends _$TokenCreationNotifier {",
        "  @override",
        "  AsyncValue<Token?> build() => const AsyncValue.data(null);",
        "",
        "  Future<void> createToken(String type, double valeur, String proprietaire) async {",
        "    state = const AsyncValue.loading();",
        "    final useCase = GetIt.I<CreateTokenUseCase>();",
        "    final result = await useCase(CreateTokenParams(",
        "      type: type, valeur: valeur, proprietaire: proprietaire));",
        "    state = result.fold(",
        "      (failure) => AsyncValue.error(failure.message, StackTrace.current),",
        "      (token)   => AsyncValue.data(token),",
        "    );",
        "  }",
        "}",
      ], C.dev1),
      sp(2),

      // ══ SECTION 5 : REPARTITION DEVS ════════════════════════════════════
      h1("5. Repartition du Travail par Developpeur"),
      sp(1),

      // ─── DEV 1 ───────────────────────────────────────────────────────────
      devBanner("Developpeur 1", "Core + Feature token_creation (bout en bout)", "feature/token-creation", C.dev1, C.dev1bg),
      sp(1),
      p("Dev 1 pose les fondations de toute l'application. Son travail est bloquant pour Dev 2 et Dev 3. Il doit livrer en priorite le core partage et la structure DI, puis implementer la feature token_creation complete (domain, data, presentation)."),
      sp(1),

      h3("Phase 1 — Core & Setup (Jours 1-4) [BLOQUANT]", C.dev1),
      bul("Initialiser le projet Flutter et configurer pubspec.yaml avec tous les packages"),
      bul("Creer la structure de dossiers lib/core/ et lib/features/ (feature-first)"),
      bul("Configurer get_it + injectable : injection_container.dart avec @module"),
      bul("Creer core/usecases/usecase.dart : interface UseCase<Type, Params>"),
      bul("Creer core/error/failures.dart : Failure, ValidationFailure, DatabaseFailure, NFCFailure, BluetoothFailure"),
      bul("Creer core/error/exceptions.dart : AppException, NFCException, BTException"),
      bul("Creer core/utils/ : AppLogger, Result<T>, CryptoHelper (sha256, hmac, nonce), DateExtensions, PermissionHelper"),
      bul("Creer core/constants/ : AppConstants (timeouts, retries), AppStrings"),
      bul("Creer core/router/app_router.dart avec go_router (routes vers les 3 features)"),
      bul("Creer core/theme/app_theme.dart (light + dark)"),
      bul("Creer core/widgets/ : TokenCard, StatusBadge, LoadingOverlay (reutilisables)"),
      bul("Configurer SQLite : DatabaseHelper avec tables tokens et transactions"),
      bul("Creer HomeScreen basique avec navigation vers les 3 ecrans"),
      bul("PR Phase 1 : merge sur develop pour debloquer Dev 2 et Dev 3"),
      sp(1),

      h3("Phase 2 — Feature token_creation (Jours 5-9)", C.dev1),
      bul("Domain : Entity Token + enum TokenStatus (pure Dart, Equatable)"),
      bul("Domain : TokenRepository interface (createToken, getAllTokens, getById, delete)"),
      bul("Domain : CreateTokenUseCase — validation + appel repository + Either<Failure, Token>"),
      bul("Domain : GetAllTokensUseCase, DeleteTokenUseCase"),
      bul("Data : TokenModel (Freezed + json_serializable) + generation build_runner"),
      bul("Data : TokenMapper (toEntity / toModel)"),
      bul("Data : TokenLocalDatasource interface + TokenLocalDatasourceImpl (SQLite + Hive)"),
      bul("Data : TokenRepositoryImpl (@injectable) — appel datasource + mapper"),
      bul("Presentation : TokenCreationNotifier (Riverpod @riverpod)"),
      bul("Presentation : CreateTokenScreen (formulaire : type, valeur, proprietaire)"),
      bul("Presentation : TokenForm widget + validation UI"),
      bul("Tests : CreateTokenUseCase (mock repository), TokenMapper, TokenRepositoryImpl"),
      sp(1),

      tbl(
        ["Fichier cle", "Chemin", "Consomme par"],
        [
          ["usecase.dart", "core/usecases/usecase.dart", "Dev 2, Dev 3"],
          ["failures.dart", "core/error/failures.dart", "Dev 2, Dev 3"],
          ["app_logger.dart", "core/utils/app_logger.dart", "Dev 2, Dev 3"],
          ["crypto_helper.dart", "core/utils/crypto_helper.dart", "Dev 3"],
          ["app_router.dart", "core/router/app_router.dart", "Dev 2, Dev 3"],
          ["database_helper.dart", "core/database/database_helper.dart", "Dev 2, Dev 3"],
          ["token_card.dart", "core/widgets/token_card.dart", "Dev 3"],
          ["token.dart (entity)", "features/token_creation/domain/entities/token.dart", "Dev 2, Dev 3"],
          ["token_repository.dart", "features/token_creation/domain/repositories/", "Dev 2"],
        ],
        [2800, 3600, 3106], C.dev1
      ),
      sp(2),

      // ─── DEV 2 ───────────────────────────────────────────────────────────
      devBanner("Developpeur 2", "Feature transfer — NFC & Bluetooth (bout en bout)", "feature/transfer", C.dev2, C.dev2bg),
      sp(1),
      p("Dev 2 prend en charge la feature transfer dans sa totalite. Il attend le merge de la Phase 1 de Dev 1 (core + entity Token) pour integrer les contrats. En attendant, il peut creer les interfaces domain et la structure de sa feature avec des stubs."),
      sp(1),

      h3("Phase 1 — Domain & Data NFC (Jours 1-6)", C.dev2),
      bul("Domain : Entity TransferResult (statut, token, methode, timestamp, erreur)"),
      bul("Domain : NFCRepository interface (sendToken, receiveToken, isAvailable)"),
      bul("Domain : BluetoothRepository interface (scan, connect, sendToken, receiveToken, disconnect)"),
      bul("Domain : SendTokenNfcUseCase — Either<NFCFailure, TransferResult>"),
      bul("Domain : ReceiveTokenNfcUseCase — Either<NFCFailure, Token>"),
      bul("Domain : SendTokenBluetoothUseCase — Either<BluetoothFailure, TransferResult>"),
      bul("Domain : ReceiveTokenBluetoothUseCase — Either<BluetoothFailure, Token>"),
      bul("Data : TransferPayloadModel (Freezed + json) — DTO pour encoder le jeton en JSON envoyable"),
      bul("Data : TokenPayloadMapper — Token entity <-> TransferPayloadModel"),
      bul("Data : NFCDatasource impl — encodage NDEF (TNF_MIME_MEDIA), LLCP/SNEP, timeout 10s"),
      bul("Data : BluetoothDatasource impl — scan BLE, GATT connect, characteristic write/read, ACK"),
      bul("Data : NFCRepositoryImpl + BluetoothRepositoryImpl (@injectable)"),
      sp(1),

      h3("Phase 2 — Presentation Transfert (Jours 7-10)", C.dev2),
      bul("Presentation : TransferNotifier (Riverpod) — etat : idle, scanning, connecting, transferring, success, error"),
      bul("Presentation : TransferScreen — selection mode NFC ou Bluetooth"),
      bul("Presentation : NFCScanAnimation widget — animation cercles pulsants pendant le scan"),
      bul("Presentation : BluetoothDeviceList widget — liste des appareils detectes avec statut"),
      bul("Presentation : TransferProgressWidget — etapes visuelles du transfert en temps reel"),
      bul("Presentation : ecran confirmation succes + ecran erreur avec retry"),
      bul("Gestion erreurs completes : NFC desactive, BT desactive, timeout, appareil incompatible, collision"),
      bul("Integration SecurityRepository de Dev 3 pour valider les jetons recus (via DI)"),
      bul("Tests : SendTokenNfcUseCase, ReceiveTokenNfcUseCase, SendTokenBluetoothUseCase (mocks)"),
      sp(1),

      tbl(
        ["Fichier cle", "Chemin", "Dependance"],
        [
          ["nfc_repository.dart", "features/transfer/domain/repositories/nfc_repository.dart", "Core failures (Dev 1)"],
          ["bluetooth_repository.dart", "features/transfer/domain/repositories/bluetooth_repository.dart", "Core failures (Dev 1)"],
          ["send_token_nfc_usecase.dart", "features/transfer/domain/usecases/", "Token entity (Dev 1)"],
          ["nfc_datasource.dart", "features/transfer/data/datasources/nfc_datasource.dart", "nfc_manager package"],
          ["bluetooth_datasource.dart", "features/transfer/data/datasources/bluetooth_datasource.dart", "flutter_blue_plus package"],
          ["transfer_payload_model.dart", "features/transfer/data/models/", "Freezed (Dev 1 setup)"],
          ["transfer_screen.dart", "features/transfer/presentation/screens/", "TransferNotifier"],
          ["nfc_scan_animation.dart", "features/transfer/presentation/widgets/", "Dev 2 uniquement"],
        ],
        [2800, 3800, 2906], C.dev2
      ),
      sp(2),

      // ─── DEV 3 ───────────────────────────────────────────────────────────
      devBanner("Developpeur 3", "Feature security_history — Securite & Historique (bout en bout)", "feature/security-history", C.dev3, C.dev3bg),
      sp(1),
      p("Dev 3 gere deux sous-domaines dans une seule feature : la securite cryptographique (partagee avec Dev 2) et l'historique des transactions avec son ecran complet. Il attend egalement le merge Phase 1 de Dev 1 pour les contrats core."),
      sp(1),

      h3("Phase 1 — Domain & Data Securite (Jours 1-5)", C.dev3),
      bul("Domain : Entity TokenSignature (hash SHA-256, signature HMAC, nonce, timestamp)"),
      bul("Domain : SecurityRepository interface (signToken, verifyToken, isDuplicate, isReplay)"),
      bul("Domain : SignTokenUseCase — calcule hash + HMAC et retourne Token signe"),
      bul("Domain : VerifyTokenUseCase — re-calcule et compare hash, detecte falsification"),
      bul("Domain : CheckDuplicateUseCase — verifie UUID en base avant insertion"),
      bul("Data : SecurityDatasource impl — appels CryptoHelper (sha256, hmac, nonce) de core/utils"),
      bul("Data : SecurityRepositoryImpl (@lazySingleton injectable) — expose aux autres features via DI"),
      bul("Tests : SignTokenUseCase, VerifyTokenUseCase avec cas falsification, doublon, rejeu"),
      sp(1),

      h3("Phase 2 — Domain & Data Historique (Jours 6-8)", C.dev3),
      bul("Domain : Entity Transaction (id, tokenId, type envoi/reception, date, statut, expediteur, destinataire, methode NFC/BT, montant)"),
      bul("Domain : HistoryRepository interface (saveTransaction, getAll, getByFilter, delete)"),
      bul("Domain : SaveTransactionUseCase — enregistre apres chaque transfert"),
      bul("Domain : GetHistoryUseCase — filtre par date, statut, methode, montant"),
      bul("Data : TransactionModel (Freezed + json) + TransactionMapper"),
      bul("Data : HistoryLocalDatasource impl — SQLite table transactions + requetes filtrees"),
      bul("Data : HistoryRepositoryImpl (@injectable)"),
      bul("Persistance hors ligne : sauvegarde auto + restauration etat apres crash"),
      sp(1),

      h3("Phase 3 — Presentation Historique (Jours 9-12)", C.dev3),
      bul("Presentation : HistoryNotifier (Riverpod) — chargement, filtrage, tri, pagination"),
      bul("Presentation : HistoryScreen — liste des transactions avec pull-to-refresh"),
      bul("Presentation : TransactionTile widget — icone NFC/BT, montant, date, statut colore"),
      bul("Presentation : FilterBar — filtres par date, type (envoi/reception), methode, statut"),
      bul("Presentation : SearchBar avec debounce 300ms — recherche en temps reel"),
      bul("Presentation : TransactionDetailScreen — toutes les metadonnees d'une transaction"),
      bul("Presentation : badge statistiques sur HomeScreen (nb jetons, total, dernier transfert)"),
      bul("Tests : HistoryNotifier, GetHistoryUseCase, HistoryRepositoryImpl"),
      sp(1),

      tbl(
        ["Fichier cle", "Chemin", "Consomme par"],
        [
          ["security_repository.dart", "features/security_history/domain/repositories/", "Dev 2 (validation reception)"],
          ["sign_token_usecase.dart", "features/security_history/domain/usecases/", "Dev 2 (avant envoi)"],
          ["verify_token_usecase.dart", "features/security_history/domain/usecases/", "Dev 2 (apres reception)"],
          ["security_repository_impl.dart", "features/security_history/data/repositories/", "Injecte via get_it"],
          ["transaction.dart (entity)", "features/security_history/domain/entities/", "Dev 3 uniquement"],
          ["history_repository_impl.dart", "features/security_history/data/repositories/", "Dev 3 uniquement"],
          ["history_screen.dart", "features/security_history/presentation/screens/", "Dev 3 uniquement"],
          ["transaction_tile.dart", "features/security_history/presentation/widgets/", "Dev 3 uniquement"],
        ],
        [2800, 3800, 2906], C.dev3
      ),
      sp(2),

      // ══ SECTION 6 : GIT ══════════════════════════════════════════════════
      h1("6. Workflow Git & Pull Requests"),
      sp(1),
      h2("6.1 Branches"),
      tbl(
        ["Branche", "Role", "Merge vers"],
        [
          ["main", "Production. Aucun commit direct.", "—"],
          ["develop", "Integration equipe. Toujours buildable.", "main"],
          ["feature/token-creation", "Dev 1 — core + creation jeton", "develop via PR"],
          ["feature/transfer", "Dev 2 — NFC + Bluetooth", "develop via PR"],
          ["feature/security-history", "Dev 3 — securite + historique", "develop via PR"],
          ["hotfix/*", "Correctifs urgents", "main + develop"],
        ],
        [3200, 3900, 2406], C.primary
      ),
      sp(1),

      h2("6.2 Conventions de Commits"),
      codeBlock([
        "# Format : type(feature/scope): description",
        "",
        "# Dev 1",
        "feat(core): configurer get_it injectable et injection container",
        "feat(core): creer UseCase interface et Failure types",
        "feat(token-creation/domain): ajouter entity Token et TokenRepository",
        "feat(token-creation/data): implementer TokenRepositoryImpl avec SQLite",
        "feat(token-creation/presentation): creer CreateTokenScreen et provider",
        "",
        "# Dev 2",
        "feat(transfer/domain): creer use cases SendTokenNfc et ReceiveTokenNfc",
        "feat(transfer/data): implementer NFCDatasource avec encodage NDEF",
        "feat(transfer/data): implementer BluetoothDatasource avec GATT",
        "feat(transfer/presentation): creer TransferScreen et NFCScanAnimation",
        "fix(transfer/data): corriger timeout NFC lors de la detection de tag",
        "",
        "# Dev 3",
        "feat(security-history/domain): creer SignTokenUseCase et VerifyTokenUseCase",
        "feat(security-history/data): implementer SecurityRepositoryImpl SHA256 HMAC",
        "feat(security-history/domain): ajouter entity Transaction et HistoryRepository",
        "feat(security-history/presentation): creer HistoryScreen avec filtres",
        "",
        "# Types : feat | fix | test | refactor | docs | chore | perf",
      ], C.secondary),
      sp(1),

      h2("6.3 Procedure Pull Request"),
      codeBlock([
        "# Avant chaque PR, executer dans l'ordre :",
        "git checkout develop && git pull origin develop",
        "git checkout feature/ma-branche && git rebase develop",
        "",
        "# Verifications obligatoires :",
        "flutter pub get",
        "dart run build_runner build --delete-conflicting-outputs",
        "flutter analyze                  # 0 erreur",
        "flutter test                     # tous verts",
        "flutter build apk --debug       # build OK",
        "",
        "git push origin feature/ma-branche",
        "# Puis creer le PR sur GitHub :",
        "# Base : develop  |  Compare : feature/ma-branche",
        "# Titre : [DEV1|DEV2|DEV3] feat(scope): description",
        "# Reviewers : les 2 autres developpeurs",
        "# Minimum 1 approval requis avant merge",
        "# Le createur du PR ne merge jamais lui-meme",
      ], C.secondary),
      sp(1),

      h2("6.4 Template PR"),
      codeBlock([
        "## Fonctionnalite / Couche implementee",
        "<!-- Ex: Feature token_creation — couche domain + data completes -->",
        "",
        "## Couches Clean Architecture touchees",
        "- [ ] core/ (utilitaires partages)",
        "- [ ] domain/ (entities, use cases, repository interfaces)",
        "- [ ] data/ (models, mappers, datasources, repository impl)",
        "- [ ] presentation/ (providers Riverpod, screens, widgets)",
        "",
        "## Checklist",
        "- [ ] flutter analyze : 0 erreur, 0 warning critique",
        "- [ ] flutter test : tous les tests passent",
        "- [ ] flutter build apk --debug : build reussi",
        "- [ ] Injection dependances configuree dans injection_container",
        "- [ ] build_runner execute (fichiers .g.dart et .freezed.dart generes)",
        "- [ ] Rebase sur develop effectue avant le push",
        "",
        "## Depends on",
        "<!-- PR de Phase 1 Dev 1 si applicable : #PR_NUMBER -->",
        "",
        "## Screenshots (ecrans modifies)",
        "",
        "## Notes reviewers (choix techniques, limitations)",
      ], "4A148C"),
      sp(2),

      // ══ SECTION 7 : CHECKLIST ════════════════════════════════════════════
      h1("7. Checklist de Livraison"),
      sp(1),
      h2("Dev 1 — Core + token_creation", C.dev1),
      chk("Core : UseCase interface, Failures, AppLogger, CryptoHelper, Router, Theme"),
      chk("Core : injection_container.dart configure avec get_it + injectable"),
      chk("Feature token_creation/domain : Token entity, TokenRepository, Use Cases"),
      chk("Feature token_creation/data : TokenModel, Mapper, Datasource, RepositoryImpl"),
      chk("Feature token_creation/presentation : provider, CreateTokenScreen, TokenForm"),
      chk("Core widgets : TokenCard, StatusBadge, LoadingOverlay disponibles"),
      chk("Tests : CreateTokenUseCase, TokenMapper, TokenRepositoryImpl"),
      chk("PR Phase 1 (core) merge sur develop avant Jour 5"),
      chk("PR feature/token-creation merge sur develop"),
      sp(1),
      h2("Dev 2 — feature/transfer", C.dev2),
      chk("Domain : TransferResult entity, NFCRepository + BluetoothRepository interfaces"),
      chk("Domain : 4 Use Cases (send/receive NFC + BT) avec Either<Failure, T>"),
      chk("Data : NFCDatasource (NDEF, LLCP, SNEP, timeout) + BluetoothDatasource (GATT, ACK)"),
      chk("Data : TransferPayloadModel, TokenPayloadMapper, Repository impls (@injectable)"),
      chk("Presentation : TransferNotifier, TransferScreen, animations NFC et BT"),
      chk("Gestion complete des erreurs NFC et Bluetooth"),
      chk("Integration SecurityRepository de Dev 3 via DI pour valider jetons recus"),
      chk("Tests sur appareils reels (pas seulement emulateur)"),
      chk("Tests unitaires Use Cases avec mocks"),
      chk("PR feature/transfer merge sur develop"),
      sp(1),
      h2("Dev 3 — feature/security-history", C.dev3),
      chk("Domain : TokenSignature entity, SecurityRepository + HistoryRepository interfaces"),
      chk("Domain : Sign/Verify/CheckDuplicate Use Cases + Save/GetHistory Use Cases"),
      chk("Data : SecurityRepositoryImpl (@lazySingleton) expose via DI pour Dev 2"),
      chk("Data : TransactionModel, Mapper, HistoryLocalDatasource, HistoryRepositoryImpl"),
      chk("Presentation : HistoryNotifier, HistoryScreen, filtres, recherche, detail"),
      chk("Persistance hors ligne + restauration apres crash"),
      chk("Tests : SignTokenUseCase, VerifyTokenUseCase, GetHistoryUseCase"),
      chk("PR feature/security-history merge sur develop"),
      sp(1),
      h2("Livraison Finale"),
      chk("APK debug + APK release generes"),
      chk("AAB (Android App Bundle) genere"),
      chk("README : setup, architecture, instructions de run et de test"),
      chk("Rapport de tests (unitaires + integration + manuels)"),
      chk("Code source tague v1.0.0 sur main"),
      sp(2),

      banner("RAPPEL : Domain ne depend de rien. Data depend de Domain. Presentation depend de Domain. Core ne depend de rien. Chaque feature est autonome. Les dependances croisees passent par les interfaces domain et le conteneur DI (get_it).", C.primary),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('./Organisation_Travail_v3_CleanArchi_FeatureFirst.docx', buf);
  console.log('OK');
});
