import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import 'tables/products_tables.dart';
import 'tables/shops_tables.dart';
import 'tables/users_tables.dart';
import 'tables/sales_tables.dart';
import 'tables/clients_tables.dart';
import 'tables/suppliers_tables.dart';
import 'tables/logistics_tables.dart';
import 'tables/system_tables.dart';
import 'tables/catalogue_tables.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [
  // Catalogue & Stocks
  Products,
  ProductStocks,
  ProductCategories,
  ProductImages,
  
  // Organisation & Multi-Boutiques
  CompanySettings,
  Shops,
  UserShopAssignments,
  
  // Utilisateurs & Sécurité
  Users,
  Workers,
  
  // Caisse, Ventes & Sessions
  CashSessions,
  Sales,
  SaleItems,
  HeldCarts,
  
  // CRM Clients & Règlements
  Clients,
  ClientPayments,
  
  // Fournisseurs & Approvisionnements
  Suppliers,
  PurchaseOrders,
  PurchaseOrderItems,
  SupplierInvoices,
  
  // Logistique, Transferts & Mouvements
  InterShopTransfers,
  InterShopTransferItems,
  StockMovements,
  
  // Audit & Synchronisation Hybride
  AuditLogs,
  SyncQueue,
  SyncState,
])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  AppDatabase.forTesting(DatabaseConnection super.connection);

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (Migrator m) async {
      await m.createAll();
    },
    onUpgrade: (Migrator m, int from, int to) async {
      for (final table in allTables) {
        try {
          await m.createTable(table);
        } catch (_) {}
      }
      try {
        await customStatement('ALTER TABLE products ADD COLUMN shop_id TEXT NOT NULL DEFAULT "";');
      } catch (_) {}
    },
    beforeOpen: (details) async {
      await customStatement('PRAGMA foreign_keys = ON;');
      await _createCustomSchema();
    },
  );

  Future<void> _createCustomSchema() async {
    // Index composites haute-performance pour recherche catalogue
    await customStatement('''
      CREATE INDEX IF NOT EXISTS idx_products_shop
      ON products(shop_id) WHERE deleted_at IS NULL;
    ''');
    await customStatement('''
      CREATE INDEX IF NOT EXISTS idx_products_supplier
      ON products(supplier_id) WHERE deleted_at IS NULL;
    ''');
    await customStatement('''
      CREATE INDEX IF NOT EXISTS idx_products_category
      ON products(category_id) WHERE deleted_at IS NULL;
    ''');
    await customStatement('''
      CREATE INDEX IF NOT EXISTS idx_product_stocks_shop
      ON product_stocks(shop_id, product_id);
    ''');
    await customStatement('''
      CREATE INDEX IF NOT EXISTS idx_products_dirty
      ON products(is_dirty) WHERE is_dirty = 1;
    ''');

    // Table virtuelle FTS5 pour recherche plein-texte < 10ms
    await customStatement('''
      CREATE VIRTUAL TABLE IF NOT EXISTS products_fts
      USING fts5(
        product_id UNINDEXED,
        name,
        barcode,
        sku,
        field1_value, field2_value, field3_value,
        content='products',
        content_rowid='rowid'
      );
    ''');

    // Triggers pour maintenir le FTS5 synchronisé automatiquement
    await customStatement('''
      CREATE TRIGGER IF NOT EXISTS products_fts_insert
      AFTER INSERT ON products BEGIN
        INSERT INTO products_fts(rowid, product_id, name, barcode, sku,
          field1_value, field2_value, field3_value)
        VALUES (new.rowid, new.id, new.name, new.barcode, new.sku,
          new.field1_value, new.field2_value, new.field3_value);
      END;
    ''');
    await customStatement('''
      CREATE TRIGGER IF NOT EXISTS products_fts_delete
      AFTER DELETE ON products BEGIN
        INSERT INTO products_fts(products_fts, rowid, product_id, name, barcode, sku,
          field1_value, field2_value, field3_value)
        VALUES ('delete', old.rowid, old.id, old.name, old.barcode, old.sku,
          old.field1_value, old.field2_value, old.field3_value);
      END;
    ''');
    await customStatement('''
      CREATE TRIGGER IF NOT EXISTS products_fts_update
      AFTER UPDATE ON products BEGIN
        INSERT INTO products_fts(products_fts, rowid, product_id, name, barcode, sku,
          field1_value, field2_value, field3_value)
        VALUES ('delete', old.rowid, old.id, old.name, old.barcode, old.sku,
          old.field1_value, old.field2_value, old.field3_value);
        INSERT INTO products_fts(rowid, product_id, name, barcode, sku,
          field1_value, field2_value, field3_value)
        VALUES (new.rowid, new.id, new.name, new.barcode, new.sku,
          new.field1_value, new.field2_value, new.field3_value);
      END;
    ''');
  }

  static LazyDatabase _openConnection() {
    return LazyDatabase(() async {
      final dbFolder = await getApplicationDocumentsDirectory();
      final file = File(p.join(dbFolder.path, 'iventello_2_0.sqlite'));

      return NativeDatabase.createInBackground(
        file,
        setup: (rawDb) {
          // Pragmas de haute performance pour point de vente offline-first
          rawDb.execute('PRAGMA journal_mode = WAL;');
          rawDb.execute('PRAGMA synchronous = NORMAL;');
          rawDb.execute('PRAGMA foreign_keys = ON;');
          rawDb.execute('PRAGMA busy_timeout = 5000;');
          rawDb.execute('PRAGMA cache_size = -20000;'); // ~20 MB de mémoire cache
          rawDb.execute('PRAGMA temp_store = MEMORY;');
        },
      );
    });
  }
}
