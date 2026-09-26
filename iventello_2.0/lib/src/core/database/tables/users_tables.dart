import 'package:drift/drift.dart';

class Users extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get email => text().withLength(min: 5, max: 200).customConstraint('UNIQUE NOT NULL')();
  TextColumn get passwordHash => text()();
  TextColumn get pinCodeHash => text().nullable()();
  
  TextColumn get firstName => text().withLength(min: 1, max: 100)();
  TextColumn get lastName => text().withLength(min: 1, max: 100)();
  TextColumn get phone => text().nullable()();
  TextColumn get avatarUrl => text().nullable()();
  
  TextColumn get globalRole => text().withDefault(const Constant('CAISSIER'))();
  RealColumn get commissionRatePercent => real().withDefault(const Constant(0.0))();
  
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  BoolColumn get mustChangePassword => boolean().withDefault(const Constant(true))();
  DateTimeColumn get lastLoginAt => dateTime().nullable()();

  IntColumn get version => integer().withDefault(const Constant(1))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

class Workers extends Table {
  TextColumn get id => text()(); // UUIDv7
  TextColumn get userId => text()(); // Lien vers Users.id
  TextColumn get shopId => text().nullable()(); // Boutique assignée (ou null si SuperAdmin/Multi-sites)
  TextColumn get employeeCode => text().nullable()(); // Matricule (ex: EMP-01)
  TextColumn get jobTitle => text().withDefault(const Constant('Caissier'))(); // Caissier, Vendeur, Magasinier, Gérant
  TextColumn get department => text().nullable()(); // Rayon, Caisse, Logistique
  IntColumn get baseSalaryCents => integer().withDefault(const Constant(0))();
  RealColumn get commissionRatePercent => real().withDefault(const Constant(0.0))();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  
  DateTimeColumn get hiredAt => dateTime().nullable()();
  IntColumn get version => integer().withDefault(const Constant(1))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  BoolColumn get isDirty => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}
