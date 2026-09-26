import 'package:drift/drift.dart';

class AuditLogs extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get shopId => text()();
  TextColumn get userId => text()();
  TextColumn get supervisorId => text().nullable()();
  
  TextColumn get actionType => text()();
  TextColumn get entityTable => text().nullable()();
  TextColumn get entityId => text().nullable()();
  
  TextColumn get oldValuesJson => text().nullable()();
  TextColumn get newValuesJson => text().nullable()();
  TextColumn get justification => text().nullable()();
  TextColumn get deviceId => text()();
  
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

class SyncQueue extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get shopId => text()();
  
  TextColumn get targetTable => text()();
  TextColumn get recordId => text()();
  TextColumn get action => text()();
  TextColumn get payloadJson => text()();
  
  TextColumn get status => text().withDefault(const Constant('PENDING'))();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
  
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get processedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
  
  @override
  List<Set<Column>> get uniqueKeys => [
    {targetTable, recordId, action, status}
  ];
}

class SyncState extends Table {
  TextColumn get targetTable => text()();
  TextColumn get shopId => text()();
  
  IntColumn get lastSyncedTimestamp => integer().withDefault(const Constant(0))();
  IntColumn get lastServerVersion => integer().withDefault(const Constant(0))();
  DateTimeColumn get lastSyncSuccessAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {targetTable, shopId};
}
