import 'package:drift/drift.dart';
import '../../../../core/database/app_database.dart';
import '../../../../core/utils/uuid_generator.dart';
import '../../domain/entities/product_entity.dart';
import '../../domain/repositories/catalogue_repository.dart';

class CatalogueRepositoryImpl implements CatalogueRepository {
  final AppDatabase db;

  CatalogueRepositoryImpl({required this.db});

  // ─────────────────────────────────────────────────────
  //  MAPPERS
  // ─────────────────────────────────────────────────────

  ProductEntity _mapProduct(Product p, {ProductStock? stock}) {
    return ProductEntity(
      id: p.id,
      shopId: p.shopId,
      name: p.name,
      barcode: p.barcode,
      sku: p.sku,
      basePriceCents: p.basePriceCents,
      sellingPriceCents: p.sellingPriceCents,
      vatRate: p.vatRate,
      isPacket: p.isPacket,
      itemsPerPacket: p.itemsPerPacket,
      unitSellingPriceCents: p.unitSellingPriceCents,
      categoryId: p.categoryId,
      supplierId: p.supplierId,
      imageUrl: p.imageUrl,
      field1Label: p.field1Label, field1Value: p.field1Value,
      field2Label: p.field2Label, field2Value: p.field2Value,
      field3Label: p.field3Label, field3Value: p.field3Value,
      field4Label: p.field4Label, field4Value: p.field4Value,
      field5Label: p.field5Label, field5Value: p.field5Value,
      field6Label: p.field6Label, field6Value: p.field6Value,
      field7Label: p.field7Label, field7Value: p.field7Value,
      field8Label: p.field8Label, field8Value: p.field8Value,
      field9Label: p.field9Label, field9Value: p.field9Value,
      field10Label: p.field10Label, field10Value: p.field10Value,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      version: p.version,
      isDirty: p.isDirty,
    );
  }

  ProductStockEntity _mapStock(ProductStock s) {
    return ProductStockEntity(
      id: s.id,
      productId: s.productId,
      shopId: s.shopId,
      quantityBoutique: s.quantityBoutique,
      quantityMagasin: s.quantityMagasin,
      quantityUnitesDetachees: s.quantityUnitesDetachees,
      quantityReservee: s.quantityReservee,
      alertLimit: s.alertLimit,
      shelfLocation: s.shelfLocation,
      pampCents: s.pampCents,
    );
  }

  CategoryEntity _mapCategory(ProductCategory c) {
    return CategoryEntity(
      id: c.id,
      name: c.name,
      parentId: c.parentId,
      color: c.color,
      iconName: c.iconName,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    );
  }

  // ─────────────────────────────────────────────────────
  //  PRODUITS
  // ─────────────────────────────────────────────────────

  @override
  Future<ProductEntity> createProduct({
    required String shopId,
    required String name,
    String? barcode,
    String? sku,
    required int basePriceCents,
    required int sellingPriceCents,
    double vatRate = 19.25,
    bool isPacket = false,
    int itemsPerPacket = 1,
    int? unitSellingPriceCents,
    String? categoryId,
    String? supplierId,
    String? imageUrl,
    int initialStock = 0,
    int alertLimit = 5,
    String? shelfLocation,
    String? field1Label, String? field1Value,
    String? field2Label, String? field2Value,
    String? field3Label, String? field3Value,
    String? field4Label, String? field4Value,
    String? field5Label, String? field5Value,
    String? field6Label, String? field6Value,
    String? field7Label, String? field7Value,
    String? field8Label, String? field8Value,
    String? field9Label, String? field9Value,
    String? field10Label, String? field10Value,
  }) async {
    final productId = UuidGenerator.v7();

    await db.transaction(() async {
      await db.into(db.products).insert(ProductsCompanion.insert(
        id: productId,
        shopId: shopId,
        name: name.trim(),
        barcode: Value(barcode?.trim()),
        sku: Value(sku?.trim()),
        basePriceCents: Value(basePriceCents),
        sellingPriceCents: Value(sellingPriceCents),
        vatRate: Value(vatRate),
        isPacket: Value(isPacket),
        itemsPerPacket: Value(itemsPerPacket),
        unitSellingPriceCents: Value(unitSellingPriceCents),
        categoryId: Value(categoryId),
        supplierId: Value(supplierId),
        imageUrl: Value(imageUrl),
        field1Label: Value(field1Label ?? 'Marque'),       field1Value: Value(field1Value),
        field2Label: Value(field2Label ?? 'Modèle'),       field2Value: Value(field2Value),
        field3Label: Value(field3Label ?? 'Couleur'),      field3Value: Value(field3Value),
        field4Label: Value(field4Label ?? 'Taille/Dimension'), field4Value: Value(field4Value),
        field5Label: Value(field5Label ?? 'Poids'),        field5Value: Value(field5Value),
        field6Label: Value(field6Label ?? "Date d'expiration"), field6Value: Value(field6Value),
        field7Label: Value(field7Label ?? 'Garantie (mois)'), field7Value: Value(field7Value),
        field8Label: Value(field8Label ?? 'Numéro de lot'), field8Value: Value(field8Value),
        field9Label: Value(field9Label ?? 'Conditionnement'), field9Value: Value(field9Value),
        field10Label: Value(field10Label ?? 'Note interne'), field10Value: Value(field10Value),
        isDirty: const Value(true),
      ));

      // Créer l'entrée stock pour cette boutique
      await db.into(db.productStocks).insert(ProductStocksCompanion.insert(
        id: UuidGenerator.v7(),
        productId: productId,
        shopId: shopId,
        quantityBoutique: Value(initialStock),
        alertLimit: Value(alertLimit),
        shelfLocation: Value(shelfLocation),
      ));
    });

    final product = await (db.select(db.products)..where((p) => p.id.equals(productId))).getSingle();
    return _mapProduct(product);
  }

  @override
  Future<ProductEntity> updateProduct({
    required String productId,
    required String shopId,
    String? name,
    String? barcode,
    String? sku,
    int? basePriceCents,
    int? sellingPriceCents,
    double? vatRate,
    bool? isPacket,
    int? itemsPerPacket,
    int? unitSellingPriceCents,
    String? categoryId,
    String? supplierId,
    String? imageUrl,
    int? alertLimit,
    String? shelfLocation,
    String? field1Label, String? field1Value,
    String? field2Label, String? field2Value,
    String? field3Label, String? field3Value,
    String? field4Label, String? field4Value,
    String? field5Label, String? field5Value,
    String? field6Label, String? field6Value,
    String? field7Label, String? field7Value,
    String? field8Label, String? field8Value,
    String? field9Label, String? field9Value,
    String? field10Label, String? field10Value,
  }) async {
    await db.transaction(() async {
      await (db.update(db.products)..where((p) => p.id.equals(productId))).write(ProductsCompanion(
        name: name != null ? Value(name.trim()) : const Value.absent(),
        barcode: barcode != null ? Value(barcode.trim()) : const Value.absent(),
        sku: sku != null ? Value(sku.trim()) : const Value.absent(),
        basePriceCents: basePriceCents != null ? Value(basePriceCents) : const Value.absent(),
        sellingPriceCents: sellingPriceCents != null ? Value(sellingPriceCents) : const Value.absent(),
        vatRate: vatRate != null ? Value(vatRate) : const Value.absent(),
        isPacket: isPacket != null ? Value(isPacket) : const Value.absent(),
        itemsPerPacket: itemsPerPacket != null ? Value(itemsPerPacket) : const Value.absent(),
        unitSellingPriceCents: unitSellingPriceCents != null ? Value(unitSellingPriceCents) : const Value.absent(),
        categoryId: categoryId != null ? Value(categoryId) : const Value.absent(),
        supplierId: supplierId != null ? Value(supplierId) : const Value.absent(),
        imageUrl: imageUrl != null ? Value(imageUrl) : const Value.absent(),
        field1Label: field1Label != null ? Value(field1Label) : const Value.absent(),
        field1Value: field1Value != null ? Value(field1Value) : const Value.absent(),
        field2Label: field2Label != null ? Value(field2Label) : const Value.absent(),
        field2Value: field2Value != null ? Value(field2Value) : const Value.absent(),
        field3Label: field3Label != null ? Value(field3Label) : const Value.absent(),
        field3Value: field3Value != null ? Value(field3Value) : const Value.absent(),
        field4Label: field4Label != null ? Value(field4Label) : const Value.absent(),
        field4Value: field4Value != null ? Value(field4Value) : const Value.absent(),
        field5Label: field5Label != null ? Value(field5Label) : const Value.absent(),
        field5Value: field5Value != null ? Value(field5Value) : const Value.absent(),
        field6Label: field6Label != null ? Value(field6Label) : const Value.absent(),
        field6Value: field6Value != null ? Value(field6Value) : const Value.absent(),
        field7Label: field7Label != null ? Value(field7Label) : const Value.absent(),
        field7Value: field7Value != null ? Value(field7Value) : const Value.absent(),
        field8Label: field8Label != null ? Value(field8Label) : const Value.absent(),
        field8Value: field8Value != null ? Value(field8Value) : const Value.absent(),
        field9Label: field9Label != null ? Value(field9Label) : const Value.absent(),
        field9Value: field9Value != null ? Value(field9Value) : const Value.absent(),
        field10Label: field10Label != null ? Value(field10Label) : const Value.absent(),
        field10Value: field10Value != null ? Value(field10Value) : const Value.absent(),
        updatedAt: Value(DateTime.now().toUtc()),
        isDirty: const Value(true),
      ));

      if (alertLimit != null || shelfLocation != null) {
        await (db.update(db.productStocks)
              ..where((s) => s.productId.equals(productId) & s.shopId.equals(shopId)))
            .write(ProductStocksCompanion(
          alertLimit: alertLimit != null ? Value(alertLimit) : const Value.absent(),
          shelfLocation: shelfLocation != null ? Value(shelfLocation) : const Value.absent(),
          updatedAt: Value(DateTime.now().toUtc()),
        ));
      }
    });

    final product = await (db.select(db.products)..where((p) => p.id.equals(productId))).getSingle();
    return _mapProduct(product);
  }

  @override
  Future<void> deleteProduct(String productId) async {
    await (db.update(db.products)..where((p) => p.id.equals(productId))).write(
      ProductsCompanion(deletedAt: Value(DateTime.now().toUtc()), isDirty: const Value(true)),
    );
  }

  @override
  Future<ProductEntity?> getProductById(String productId, {String? shopId}) async {
    var q = db.select(db.products)..where((p) => p.id.equals(productId) & p.deletedAt.isNull());
    if (shopId != null) {
      q = q..where((p) => p.shopId.equals(shopId));
    }
    final product = await q.getSingleOrNull();
    if (product == null) return null;
    return _mapProduct(product);
  }

  @override
  Future<ProductEntity?> getProductByBarcode(String barcode, {String? shopId}) async {
    var q = db.select(db.products)..where((p) => p.barcode.equals(barcode) & p.deletedAt.isNull());
    if (shopId != null) {
      q = q..where((p) => p.shopId.equals(shopId));
    }
    final product = await q.getSingleOrNull();
    if (product == null) return null;
    return _mapProduct(product);
  }

  @override
  Future<List<ProductEntity>> searchProducts({
    required String shopId,
    String? query,
    String? categoryId,
    String? supplierId,
    bool? lowStockOnly,
    int limit = 50,
    int offset = 0,
  }) async {
    if (query != null && query.trim().isNotEmpty) {
      // Recherche FTS5 ultra-rapide scopée à la boutique
      final ftsQuery = query.trim().split(' ').map((w) => '$w*').join(' ');
      final results = await db.customSelect(
        '''
        SELECT p.* FROM products p
        JOIN products_fts fts ON fts.product_id = p.id
        WHERE products_fts MATCH ?
          AND p.shop_id = ?
          AND p.deleted_at IS NULL
        ORDER BY rank
        LIMIT ? OFFSET ?
        ''',
        variables: [Variable.withString(ftsQuery), Variable.withString(shopId), Variable.withInt(limit), Variable.withInt(offset)],
        readsFrom: {db.products},
      ).get();

      return results.map((r) => _mapFromRow(r.data)).toList();
    }

    // Requête classique avec isolation stricte par boutique
    var q = db.select(db.products)..where((p) => p.shopId.equals(shopId) & p.deletedAt.isNull());
    if (categoryId != null) q = q..where((p) => p.categoryId.equals(categoryId));
    if (supplierId != null) q = q..where((p) => p.supplierId.equals(supplierId));
    q = q..orderBy([(p) => OrderingTerm.asc(p.name)]);
    (q as SimpleSelectStatement).limit(limit, offset: offset);

    final products = await q.get();
    return products.map((p) => _mapProduct(p)).toList();
  }

  @override
  Stream<List<ProductEntity>> watchProducts({
    required String shopId,
    String? categoryId,
    bool? lowStockOnly,
  }) {
    final q = db.select(db.products)..where((p) => p.shopId.equals(shopId) & p.deletedAt.isNull());
    if (categoryId != null) (q..where((p) => p.categoryId.equals(categoryId)));
    q..orderBy([(p) => OrderingTerm.asc(p.name)]);
    return q.watch().map((list) => list.map((p) => _mapProduct(p)).toList());
  }

  // ─────────────────────────────────────────────────────
  //  STOCK
  // ─────────────────────────────────────────────────────

  @override
  Future<ProductStockEntity?> getStock({required String productId, required String shopId}) async {
    final s = await (db.select(db.productStocks)
          ..where((s) => s.productId.equals(productId) & s.shopId.equals(shopId)))
        .getSingleOrNull();
    if (s == null) return null;
    return _mapStock(s);
  }

  @override
  Future<void> adjustStock({
    required String productId,
    required String shopId,
    required int deltaQuantityBoutique,
    int deltaQuantityMagasin = 0,
    String? reason,
  }) async {
    await db.transaction(() async {
      final existing = await (db.select(db.productStocks)
            ..where((s) => s.productId.equals(productId) & s.shopId.equals(shopId)))
          .getSingleOrNull();

      if (existing == null) {
        await db.into(db.productStocks).insert(ProductStocksCompanion.insert(
          id: UuidGenerator.v7(),
          productId: productId,
          shopId: shopId,
          quantityBoutique: Value(deltaQuantityBoutique.clamp(0, 999999)),
          quantityMagasin: Value(deltaQuantityMagasin.clamp(0, 999999)),
        ));
      } else {
        final newQtyBoutique = (existing.quantityBoutique + deltaQuantityBoutique).clamp(0, 999999);
        final newQtyMagasin = (existing.quantityMagasin + deltaQuantityMagasin).clamp(0, 999999);
        await (db.update(db.productStocks)
              ..where((s) => s.productId.equals(productId) & s.shopId.equals(shopId)))
            .write(ProductStocksCompanion(
          quantityBoutique: Value(newQtyBoutique),
          quantityMagasin: Value(newQtyMagasin),
          updatedAt: Value(DateTime.now().toUtc()),
          isDirty: const Value(true),
        ));
      }

      // Journalisation mouvement de stock
      final qBefore = existing?.quantityBoutique ?? 0;
      final qAfter = (qBefore + deltaQuantityBoutique).clamp(0, 999999);
      await db.into(db.stockMovements).insert(StockMovementsCompanion.insert(
        id: UuidGenerator.v7(),
        productId: productId,
        shopId: shopId,
        type: 'AJUSTEMENT_INVENTAIRE',
        deltaQuantity: deltaQuantityBoutique,
        quantityBefore: qBefore,
        quantityAfter: qAfter,
        operatorId: 'SYSTEM',
        notes: Value(reason ?? 'Ajustement manuel'),
      ));

    });
  }

  // ─────────────────────────────────────────────────────
  //  CATÉGORIES
  // ─────────────────────────────────────────────────────

  @override
  Future<List<CategoryEntity>> getCategories() async {
    final cats = await (db.select(db.productCategories)
          ..where((c) => c.isActive.equals(true))
          ..orderBy([(c) => OrderingTerm.asc(c.sortOrder), (c) => OrderingTerm.asc(c.name)]))
        .get();
    return cats.map(_mapCategory).toList();
  }

  @override
  Future<CategoryEntity> createCategory({
    required String name,
    String? parentId,
    String? color,
    String? iconName,
  }) async {
    final id = UuidGenerator.v7();
    await db.into(db.productCategories).insert(ProductCategoriesCompanion.insert(
      id: id,
      name: name.trim(),
      parentId: Value(parentId),
      color: Value(color),
      iconName: Value(iconName),
    ));
    final cat = await (db.select(db.productCategories)..where((c) => c.id.equals(id))).getSingle();
    return _mapCategory(cat);
  }

  @override
  Future<void> deleteCategory(String categoryId) async {
    await (db.update(db.productCategories)..where((c) => c.id.equals(categoryId)))
        .write(const ProductCategoriesCompanion(isActive: Value(false)));
  }

  // ─────────────────────────────────────────────────────
  //  Helper : reconstruire ProductEntity depuis Map<String,dynamic>
  // ─────────────────────────────────────────────────────
  ProductEntity _mapFromRow(Map<String, dynamic> r) {
    return ProductEntity(
      id: r['id'] as String,
      shopId: (r['shop_id'] as String?) ?? '',
      name: r['name'] as String,
      barcode: r['barcode'] as String?,
      sku: r['sku'] as String?,
      basePriceCents: (r['base_price_cents'] as int?) ?? 0,
      sellingPriceCents: (r['selling_price_cents'] as int?) ?? 0,
      vatRate: (r['vat_rate'] as num?)?.toDouble() ?? 19.25,
      isPacket: (r['is_packet'] as int?) == 1,
      itemsPerPacket: (r['items_per_packet'] as int?) ?? 1,
      unitSellingPriceCents: r['unit_selling_price_cents'] as int?,
      categoryId: r['category_id'] as String?,
      supplierId: r['supplier_id'] as String?,
      imageUrl: r['image_url'] as String?,
      field1Label: r['field1_label'] as String?,   field1Value: r['field1_value'] as String?,
      field2Label: r['field2_label'] as String?,   field2Value: r['field2_value'] as String?,
      field3Label: r['field3_label'] as String?,   field3Value: r['field3_value'] as String?,
      field4Label: r['field4_label'] as String?,   field4Value: r['field4_value'] as String?,
      field5Label: r['field5_label'] as String?,   field5Value: r['field5_value'] as String?,
      field6Label: r['field6_label'] as String?,   field6Value: r['field6_value'] as String?,
      field7Label: r['field7_label'] as String?,   field7Value: r['field7_value'] as String?,
      field8Label: r['field8_label'] as String?,   field8Value: r['field8_value'] as String?,
      field9Label: r['field9_label'] as String?,   field9Value: r['field9_value'] as String?,
      field10Label: r['field10_label'] as String?, field10Value: r['field10_value'] as String?,
      createdAt: DateTime.tryParse(r['created_at']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(r['updated_at']?.toString() ?? '') ?? DateTime.now(),
      version: (r['version'] as int?) ?? 1,
      isDirty: (r['is_dirty'] as int?) == 1,
    );
  }
}
