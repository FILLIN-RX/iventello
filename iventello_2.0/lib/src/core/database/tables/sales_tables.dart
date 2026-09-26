import 'package:drift/drift.dart';

class CashSessions extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get shopId => text()();
  TextColumn get cashierId => text()();
  
  DateTimeColumn get openedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get closedAt => dateTime().nullable()();
  TextColumn get status => text().withDefault(const Constant('OUVERTE'))();
  
  IntColumn get openingAmountCents => integer().withDefault(const Constant(0))();
  IntColumn get closingAmountExpectedCents => integer().nullable()();
  IntColumn get closingAmountActualCents => integer().nullable()();
  IntColumn get differenceCents => integer().nullable()();
  
  IntColumn get totalSalesCents => integer().withDefault(const Constant(0))();
  IntColumn get totalDepositsCents => integer().withDefault(const Constant(0))();
  IntColumn get totalCashInCents => integer().withDefault(const Constant(0))();
  IntColumn get totalCashOutCents => integer().withDefault(const Constant(0))();
  IntColumn get totalMobileMoneyCents => integer().withDefault(const Constant(0))();
  IntColumn get totalCardCents => integer().withDefault(const Constant(0))();
  IntColumn get totalCreditSalesCents => integer().withDefault(const Constant(0))();
  
  TextColumn get notes => text().nullable()();
  IntColumn get version => integer().withDefault(const Constant(1))();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

class Sales extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get shopId => text()();
  TextColumn get sessionId => text().references(CashSessions, #id)();
  TextColumn get invoiceNumber => text().customConstraint('UNIQUE NOT NULL')();
  
  TextColumn get clientId => text().nullable()();
  TextColumn get cashierId => text()();
  
  IntColumn get subTotalCents => integer()();
  IntColumn get vatTotalCents => integer().withDefault(const Constant(0))();
  IntColumn get discountTotalCents => integer().withDefault(const Constant(0))();
  IntColumn get finalTotalCents => integer()();
  
  IntColumn get depositAmountCents => integer().nullable()();
  IntColumn get remainingBalanceCents => integer().withDefault(const Constant(0))();
  
  IntColumn get paidAmountCents => integer()();
  IntColumn get changeReturnedCents => integer().withDefault(const Constant(0))();
  
  TextColumn get paymentMethod => text()();
  TextColumn get paymentReference => text().nullable()();
  TextColumn get status => text().withDefault(const Constant('VALIDE'))();
  
  BoolColumn get isPendingDelivery => boolean().withDefault(const Constant(false))();
  TextColumn get deliveryStatus => text().nullable()();
  DateTimeColumn get notifiedAt => dateTime().nullable()();
  
  DateTimeColumn get validatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

class SaleItems extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get saleId => text().references(Sales, #id, onDelete: KeyAction.cascade)();
  TextColumn get productId => text()();
  
  TextColumn get productName => text()();
  TextColumn get barcode => text().nullable()();
  
  IntColumn get quantity => integer()();
  IntColumn get unitPriceCents => integer()();
  IntColumn get subTotalCents => integer()();
  IntColumn get discountCents => integer().withDefault(const Constant(0))();
  BoolColumn get wasDetachedFromPacket => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

class HeldCarts extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get shopId => text()();
  TextColumn get cashierId => text()();
  TextColumn get label => text()();
  TextColumn get cartPayloadJson => text()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
