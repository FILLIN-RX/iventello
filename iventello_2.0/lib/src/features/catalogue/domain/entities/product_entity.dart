/// Entité Produit — couche domaine
class ProductEntity {
  final String id;
  final String shopId;
  final String name;
  final String? barcode;
  final String? sku;
  final int basePriceCents;
  final int sellingPriceCents;
  final double vatRate;
  final bool isPacket;
  final int itemsPerPacket;
  final int? unitSellingPriceCents;
  final String? categoryId;
  final String? categoryName;
  final String? supplierId;
  final String? supplierName;
  final String? imageUrl;
  final List<String> galleryImages;

  // 10 attributs universels
  final String? field1Label;
  final String? field1Value;
  final String? field2Label;
  final String? field2Value;
  final String? field3Label;
  final String? field3Value;
  final String? field4Label;
  final String? field4Value;
  final String? field5Label;
  final String? field5Value;
  final String? field6Label;
  final String? field6Value;
  final String? field7Label;
  final String? field7Value;
  final String? field8Label;
  final String? field8Value;
  final String? field9Label;
  final String? field9Value;
  final String? field10Label;
  final String? field10Value;

  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isDirty;

  const ProductEntity({
    required this.id,
    required this.shopId,
    required this.name,
    this.barcode,
    this.sku,
    required this.basePriceCents,
    required this.sellingPriceCents,
    this.vatRate = 19.25,
    this.isPacket = false,
    this.itemsPerPacket = 1,
    this.unitSellingPriceCents,
    this.categoryId,
    this.categoryName,
    this.supplierId,
    this.supplierName,
    this.imageUrl,
    this.galleryImages = const [],
    this.field1Label = 'Marque',
    this.field1Value,
    this.field2Label = 'Modèle',
    this.field2Value,
    this.field3Label = 'Couleur',
    this.field3Value,
    this.field4Label = 'Taille/Dimension',
    this.field4Value,
    this.field5Label = 'Poids',
    this.field5Value,
    this.field6Label = "Date d'expiration",
    this.field6Value,
    this.field7Label = 'Garantie (mois)',
    this.field7Value,
    this.field8Label = 'Numéro de lot',
    this.field8Value,
    this.field9Label = 'Conditionnement',
    this.field9Value,
    this.field10Label = 'Note interne',
    this.field10Value,
    required this.createdAt,
    required this.updatedAt,
    this.version = 1,
    this.isDirty = false,
  });

  /// Prix de vente formaté (en unités monétaires)
  double get sellingPrice => sellingPriceCents / 100;
  double get basePrice => basePriceCents / 100;
  double get unitSellingPrice => (unitSellingPriceCents ?? 0) / 100;

  /// Marge brute en %
  double get marginPercent => basePriceCents > 0
      ? ((sellingPriceCents - basePriceCents) / basePriceCents) * 100
      : 0;

  /// Liste des attributs non-vides pour affichage
  List<({String label, String value})> get nonEmptyAttributes {
    final all = [
      (label: field1Label ?? '', value: field1Value ?? ''),
      (label: field2Label ?? '', value: field2Value ?? ''),
      (label: field3Label ?? '', value: field3Value ?? ''),
      (label: field4Label ?? '', value: field4Value ?? ''),
      (label: field5Label ?? '', value: field5Value ?? ''),
      (label: field6Label ?? '', value: field6Value ?? ''),
      (label: field7Label ?? '', value: field7Value ?? ''),
      (label: field8Label ?? '', value: field8Value ?? ''),
      (label: field9Label ?? '', value: field9Value ?? ''),
      (label: field10Label ?? '', value: field10Value ?? ''),
    ];
    return all.where((a) => a.value.isNotEmpty).toList();
  }

  ProductEntity copyWith({
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
    String? categoryName,
    String? supplierId,
    String? supplierName,
    String? imageUrl,
    List<String>? galleryImages,
    bool? isDirty,
  }) {
    return ProductEntity(
      id: id,
      shopId: shopId,
      name: name ?? this.name,
      barcode: barcode ?? this.barcode,
      sku: sku ?? this.sku,
      basePriceCents: basePriceCents ?? this.basePriceCents,
      sellingPriceCents: sellingPriceCents ?? this.sellingPriceCents,
      vatRate: vatRate ?? this.vatRate,
      isPacket: isPacket ?? this.isPacket,
      itemsPerPacket: itemsPerPacket ?? this.itemsPerPacket,
      unitSellingPriceCents: unitSellingPriceCents ?? this.unitSellingPriceCents,
      categoryId: categoryId ?? this.categoryId,
      categoryName: categoryName ?? this.categoryName,
      supplierId: supplierId ?? this.supplierId,
      supplierName: supplierName ?? this.supplierName,
      imageUrl: imageUrl ?? this.imageUrl,
      galleryImages: galleryImages ?? this.galleryImages,
      field1Label: field1Label, field1Value: field1Value,
      field2Label: field2Label, field2Value: field2Value,
      field3Label: field3Label, field3Value: field3Value,
      field4Label: field4Label, field4Value: field4Value,
      field5Label: field5Label, field5Value: field5Value,
      field6Label: field6Label, field6Value: field6Value,
      field7Label: field7Label, field7Value: field7Value,
      field8Label: field8Label, field8Value: field8Value,
      field9Label: field9Label, field9Value: field9Value,
      field10Label: field10Label, field10Value: field10Value,
      createdAt: createdAt,
      updatedAt: updatedAt,
      version: version,
      isDirty: isDirty ?? this.isDirty,
    );
  }
}

/// Entité Stock pour une boutique donnée
class ProductStockEntity {
  final String id;
  final String productId;
  final String shopId;
  final int quantityBoutique;
  final int quantityMagasin;
  final int quantityUnitesDetachees;
  final int quantityReservee;
  final int alertLimit;
  final String? shelfLocation;
  final int pampCents;

  const ProductStockEntity({
    required this.id,
    required this.productId,
    required this.shopId,
    this.quantityBoutique = 0,
    this.quantityMagasin = 0,
    this.quantityUnitesDetachees = 0,
    this.quantityReservee = 0,
    this.alertLimit = 5,
    this.shelfLocation,
    this.pampCents = 0,
  });

  int get totalDisponible => quantityBoutique + quantityMagasin + quantityUnitesDetachees - quantityReservee;
  bool get isLowStock => totalDisponible <= alertLimit;
  bool get isOutOfStock => totalDisponible <= 0;
  double get pamp => pampCents / 100;
}

/// Entité Catégorie
class CategoryEntity {
  final String id;
  final String name;
  final String? parentId;
  final String? color;
  final String? iconName;
  final int sortOrder;
  final bool isActive;

  const CategoryEntity({
    required this.id,
    required this.name,
    this.parentId,
    this.color,
    this.iconName,
    this.sortOrder = 0,
    this.isActive = true,
  });
}
