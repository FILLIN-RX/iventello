import 'package:drift/drift.dart';
import 'products_tables.dart';
import 'shops_tables.dart';

class InterShopTransfers extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get transferNumber => text().customConstraint('UNIQUE')();
  
  TextColumn get sourceShopId => text().references(Shops, #id)();
  TextColumn get targetShopId => text().references(Shops, #id)();
  
  // Statut unifié: 'BROUILLON' | 'EN_TRANSIT' | 'RECU_CONFORME' | 'RECU_LITIGE' | 'ANNULE'
  TextColumn get status => text().withDefault(const Constant('BROUILLON'))();
  
  TextColumn get createdByUserId => text()();
  TextColumn get receivedByUserId => text().nullable()();
  
  DateTimeColumn get shippedAt => dateTime().nullable()();
  DateTimeColumn get receivedAt => dateTime().nullable()();
  
  TextColumn get notes => text().nullable()();
  TextColumn get disputeReason => text().nullable()();

  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

class InterShopTransferItems extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get transferId => text().references(InterShopTransfers, #id, onDelete: KeyAction.cascade)();
  TextColumn get productId => text()();
  
  IntColumn get quantityShipped => integer()();
  IntColumn get quantityReceived => integer().nullable()();
  IntColumn get unitCostCents => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

class StockMovements extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get productId => text().references(Products, #id)();
  TextColumn get shopId => text()();
  
  // 'VENTE' | 'ACHAT_RECEPTION' | 'TRANSFERT_SORTANT' | 'TRANSFERT_ENTRANT' | 'DECONDITIONNEMENT' | 'AJUSTEMENT_INVENTAIRE' | 'CASSE_PERTE' | 'RETOUR_CLIENT'
  TextColumn get type => text()();
  
  IntColumn get deltaQuantity => integer()();
  IntColumn get quantityBefore => integer()();
  IntColumn get quantityAfter => integer()();
  
  IntColumn get unitCostCents => integer().nullable()();
  TextColumn get referenceDoc => text().nullable()();
  TextColumn get operatorId => text()();
  TextColumn get notes => text().nullable()();
  
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}
