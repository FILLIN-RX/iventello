import '../entities/product_entity.dart';

abstract class CatalogueRepository {
  // ── Produits ──────────────────────────────────────
  Future<ProductEntity> createProduct({
    required String shopId,
    required String name,
    String? barcode,
    String? sku,
    required int basePriceCents,
    required int sellingPriceCents,
    double vatRate,
    bool isPacket,
    int itemsPerPacket,
    int? unitSellingPriceCents,
    String? categoryId,
    String? supplierId,
    String? imageUrl,
    int initialStock,
    int alertLimit,
    String? shelfLocation,
    // attributs
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
  });

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
  });

  Future<void> deleteProduct(String productId);

  Future<ProductEntity?> getProductById(String productId, {String? shopId});
  Future<ProductEntity?> getProductByBarcode(String barcode, {String? shopId});

  /// Recherche FTS5 (< 10 ms sur 50 000 refs)
  Future<List<ProductEntity>> searchProducts({
    required String shopId,
    String? query,
    String? categoryId,
    String? supplierId,
    bool? lowStockOnly,
    int limit,
    int offset,
  });

  Stream<List<ProductEntity>> watchProducts({
    required String shopId,
    String? categoryId,
    bool? lowStockOnly,
  });

  // ── Stock ─────────────────────────────────────────
  Future<ProductStockEntity?> getStock({required String productId, required String shopId});
  Future<void> adjustStock({
    required String productId,
    required String shopId,
    required int deltaQuantityBoutique,
    int deltaQuantityMagasin,
    String? reason,
  });

  // ── Catégories ────────────────────────────────────
  Future<List<CategoryEntity>> getCategories();
  Future<CategoryEntity> createCategory({required String name, String? parentId, String? color, String? iconName});
  Future<void> deleteCategory(String categoryId);
}
