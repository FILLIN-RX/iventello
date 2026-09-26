import 'package:drift/drift.dart';

class Clients extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get shopId => text().nullable()(); // Null = Réseau | Non-Null = Local
  
  TextColumn get name => text().withLength(min: 1, max: 200)();
  TextColumn get phone => text().nullable().customConstraint('UNIQUE')();
  TextColumn get email => text().nullable()();
  TextColumn get address => text().nullable()();
  TextColumn get taxNumber => text().nullable()();
  
  TextColumn get category => text().withDefault(const Constant('STANDARD'))();
  RealColumn get defaultDiscountPercent => real().withDefault(const Constant(0.0))();
  
  IntColumn get creditLimitCents => integer().withDefault(const Constant(0))();
  IntColumn get currentDebtCents => integer().withDefault(const Constant(0))();
  IntColumn get totalSpentCents => integer().withDefault(const Constant(0))();
  IntColumn get loyaltyPoints => integer().withDefault(const Constant(0))();
  
  TextColumn get notes => text().nullable()();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();

  IntColumn get version => integer().withDefault(const Constant(1))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

class ClientPayments extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get shopId => text()();
  TextColumn get clientId => text().references(Clients, #id)();
  TextColumn get cashierId => text()();
  TextColumn get receiptNumber => text().customConstraint('UNIQUE')();
  
  IntColumn get amountCents => integer()();
  TextColumn get paymentMethod => text()();
  TextColumn get paymentReference => text().nullable()();
  TextColumn get notes => text().nullable()();
  
  DateTimeColumn get paymentDate => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}
