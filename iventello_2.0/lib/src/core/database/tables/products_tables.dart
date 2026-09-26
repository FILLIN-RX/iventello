import 'package:drift/drift.dart';

class Products extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get shopId => text()(); // Boutique propriétaire (isolation stricte par boutique)
  TextColumn get barcode => text().nullable()();
  TextColumn get sku => text().nullable()();
  TextColumn get name => text().withLength(min: 1, max: 255)();
  
  IntColumn get basePriceCents => integer().withDefault(const Constant(0))();
  IntColumn get sellingPriceCents => integer().withDefault(const Constant(0))();
  RealColumn get vatRate => real().withDefault(const Constant(19.25))();
  
  BoolColumn get isPacket => boolean().withDefault(const Constant(false))();
  IntColumn get itemsPerPacket => integer().withDefault(const Constant(1))();
  IntColumn get unitSellingPriceCents => integer().nullable()();

  TextColumn get categoryId => text().nullable()();
  TextColumn get supplierId => text().nullable()();
  TextColumn get imageUrl => text().nullable()();

  // 10 Attributs universels
  TextColumn get field1Label => text().nullable().withDefault(const Constant('Marque'))();
  TextColumn get field1Value => text().nullable()();
  TextColumn get field2Label => text().nullable().withDefault(const Constant('Modèle'))();
  TextColumn get field2Value => text().nullable()();
  TextColumn get field3Label => text().nullable().withDefault(const Constant('Couleur'))();
  TextColumn get field3Value => text().nullable()();
  TextColumn get field4Label => text().nullable().withDefault(const Constant('Taille/Dimension'))();
  TextColumn get field4Value => text().nullable()();
  TextColumn get field5Label => text().nullable().withDefault(const Constant('Poids'))();
  TextColumn get field5Value => text().nullable()();
  TextColumn get field6Label => text().nullable().withDefault(const Constant("Date d'expiration"))();
  TextColumn get field6Value => text().nullable()();
  TextColumn get field7Label => text().nullable().withDefault(const Constant('Garantie (mois)'))();
  TextColumn get field7Value => text().nullable()();
  TextColumn get field8Label => text().nullable().withDefault(const Constant('Numéro de lot'))();
  TextColumn get field8Value => text().nullable()();
  TextColumn get field9Label => text().nullable().withDefault(const Constant('Conditionnement'))();
  TextColumn get field9Value => text().nullable()();
  TextColumn get field10Label => text().nullable().withDefault(const Constant('Note interne'))();
  TextColumn get field10Value => text().nullable()();

  IntColumn get version => integer().withDefault(const Constant(1))();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<Set<Column>> get uniqueKeys => [
    {shopId, barcode}
  ];
}

class ProductStocks extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get productId => text().references(Products, #id, onDelete: KeyAction.cascade)();
  TextColumn get shopId => text()();
  
  IntColumn get quantityBoutique => integer().withDefault(const Constant(0))();
  IntColumn get quantityMagasin => integer().withDefault(const Constant(0))();
  IntColumn get quantityUnitesDetachees => integer().withDefault(const Constant(0))();
  IntColumn get quantityReservee => integer().withDefault(const Constant(0))();
  
  IntColumn get alertLimit => integer().withDefault(const Constant(5))();
  TextColumn get shelfLocation => text().nullable()();
  IntColumn get pampCents => integer().withDefault(const Constant(0))();

  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
  
  @override
  List<Set<Column>> get uniqueKeys => [
    {productId, shopId}
  ];
}
