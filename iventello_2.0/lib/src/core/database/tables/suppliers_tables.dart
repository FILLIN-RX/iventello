import 'package:drift/drift.dart';

class Suppliers extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get shopId => text().nullable()(); // Null = Réseau | Non-Null = Local
  
  TextColumn get name => text().withLength(min: 1, max: 200)();
  TextColumn get contactPerson => text().nullable()();
  TextColumn get email => text().nullable()();
  TextColumn get phone => text().nullable()();
  TextColumn get address => text().nullable()();
  TextColumn get city => text().nullable()();
  TextColumn get taxNumber => text().nullable()();
  
  IntColumn get leadTimeDays => integer().withDefault(const Constant(3))();
  TextColumn get paymentTerms => text().withDefault(const Constant('COMPTANT'))();
  TextColumn get bankDetails => text().nullable()();
  
  IntColumn get currentDebtCents => integer().withDefault(const Constant(0))();
  IntColumn get totalPurchasesCents => integer().withDefault(const Constant(0))();
  
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

class PurchaseOrders extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get shopId => text()();
  TextColumn get supplierId => text().references(Suppliers, #id)();
  TextColumn get orderNumber => text().customConstraint('UNIQUE NOT NULL')();
  
  // 'BROUILLON' | 'ENVOYE' | 'CONFIRME' | 'LIVRE_PARTIEL' | 'LIVRE_CONFORME' | 'LIVRE_LITIGE' | 'ANNULE'
  TextColumn get status => text().withDefault(const Constant('BROUILLON'))();
  IntColumn get totalEstimatedCents => integer().withDefault(const Constant(0))();
  
  TextColumn get pdfPath => text().nullable()();
  TextColumn get notes => text().nullable()();
  
  DateTimeColumn get orderedAt => dateTime().nullable()();
  DateTimeColumn get expectedDeliveryDate => dateTime().nullable()();
  DateTimeColumn get receivedAt => dateTime().nullable()();

  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

class PurchaseOrderItems extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get orderId => text().references(PurchaseOrders, #id, onDelete: KeyAction.cascade)();
  TextColumn get productId => text()();
  
  TextColumn get productName => text()();
  TextColumn get productBarcode => text().nullable()();
  
  IntColumn get quantityOrdered => integer()();
  IntColumn get quantityReceived => integer().withDefault(const Constant(0))();
  IntColumn get unitCostCents => integer()();
  
  IntColumn get stockAtOrderTime => integer()();
  IntColumn get alertLimitAtOrderTime => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

class SupplierInvoices extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get shopId => text()();
  TextColumn get supplierId => text().references(Suppliers, #id)();
  TextColumn get purchaseOrderId => text().nullable().references(PurchaseOrders, #id)();
  
  TextColumn get invoiceNumber => text()();
  TextColumn get deliveryNoteNumber => text().nullable()();
  
  IntColumn get subTotalCents => integer()();
  IntColumn get taxTotalCents => integer().withDefault(const Constant(0))();
  IntColumn get finalTotalCents => integer()();
  IntColumn get paidAmountCents => integer().withDefault(const Constant(0))();
  IntColumn get remainingDebtCents => integer()();
  
  TextColumn get paymentStatus => text().withDefault(const Constant('NON_PAYEE'))();
  
  DateTimeColumn get invoiceDate => dateTime()();
  DateTimeColumn get dueDate => dateTime()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}
