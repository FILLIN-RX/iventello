import 'package:drift/drift.dart';
import 'products_tables.dart';

/// Catégories hiérarchiques (parent nullable = catégorie racine)
class ProductCategories extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get name => text().withLength(min: 1, max: 120)();
  TextColumn get parentId => text().nullable().references(ProductCategories, #id, onDelete: KeyAction.setNull)();
  TextColumn get color => text().nullable()(); // ex: '#2563EB'
  TextColumn get iconName => text().nullable()(); // nom icône Material

  IntColumn get sortOrder => integer().withDefault(const Constant(0))();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();

  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// Photos additionnelles d'un produit (galerie)
class ProductImages extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get productId => text().references(Products, #id, onDelete: KeyAction.cascade)();
  TextColumn get imageUrl => text()();
  BoolColumn get isPrimary => boolean().withDefault(const Constant(false))();
  IntColumn get sortOrder => integer().withDefault(const Constant(0))();

  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
