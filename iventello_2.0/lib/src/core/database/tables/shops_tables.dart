import 'package:drift/drift.dart';

class CompanySettings extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get companyName => text()();
  TextColumn get warehouseTopology => text().withDefault(const Constant('DECENTRALIZED'))();
  TextColumn get centralWarehouseShopId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

class Shops extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get code => text().withLength(min: 2, max: 20).customConstraint('UNIQUE NOT NULL')();
  TextColumn get name => text().withLength(min: 1, max: 150)();
  TextColumn get address => text().nullable()();
  TextColumn get city => text().nullable()();
  TextColumn get phone => text().nullable()();
  TextColumn get email => text().nullable()();
  TextColumn get logoPath => text().nullable()();
  
  TextColumn get taxRegistrationNumber => text().nullable()();
  TextColumn get tradeRegisterNumber => text().nullable()();
  RealColumn get defaultVatRate => real().withDefault(const Constant(19.25))();
  TextColumn get currencySymbol => text().withDefault(const Constant('FCFA'))();
  
  TextColumn get receiptHeader => text().nullable()();
  TextColumn get receiptFooter => text().nullable()();
  
  BoolColumn get isMobileMoneyEnabled => boolean().withDefault(const Constant(false))();
  BoolColumn get isCanalPlusEnabled => boolean().withDefault(const Constant(false))();
  BoolColumn get isBookstoreEnabled => boolean().withDefault(const Constant(false))();
  
  TextColumn get type => text().withDefault(const Constant('BOUTIQUE_VENTE'))();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();

  IntColumn get version => integer().withDefault(const Constant(1))();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

class UserShopAssignments extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get userId => text()();
  TextColumn get shopId => text().references(Shops, #id, onDelete: KeyAction.cascade)();
  
  TextColumn get role => text().withDefault(const Constant('CAISSIER'))();
  RealColumn get maxDiscountPercent => real().withDefault(const Constant(5.0))();
  
  BoolColumn get canOpenDrawerWithoutSale => boolean().withDefault(const Constant(false))();
  BoolColumn get canCancelTicket => boolean().withDefault(const Constant(false))();
  BoolColumn get canPerformInventory => boolean().withDefault(const Constant(false))();
  BoolColumn get canInitiateTransfer => boolean().withDefault(const Constant(false))();

  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
  
  @override
  List<Set<Column>> get uniqueKeys => [
    {userId, shopId}
  ];
}
