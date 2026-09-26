import 'package:drift/drift.dart';
import '../../../../core/database/app_database.dart';
import '../../../../core/utils/password_hasher.dart';
import '../../../../core/utils/uuid_generator.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/entities/shop_entity.dart';

abstract class AuthLocalDataSource {
  Future<bool> hasUsers();
  Future<UserEntity?> findUserByEmail(String email);
  Future<UserEntity?> findUserById(String id);
  Future<UserEntity> saveSuperAdmin({
    required String id,
    required String email,
    required String firstName,
    required String lastName,
    required String password,
    String? pin,
  });
  Future<void> updatePassword(String userId, String newPassword);
  Future<void> updatePinCode(String userId, String newPin);
  Future<List<ShopEntity>> getActiveShops();
  Future<String?> findAssignedShopForUser(String userId);
}

class AuthLocalDataSourceImpl implements AuthLocalDataSource {
  final AppDatabase db;

  AuthLocalDataSourceImpl(this.db);

  @override
  Future<bool> hasUsers() async {
    final users = await db.select(db.users).get();
    return users.isNotEmpty;
  }

  @override
  Future<UserEntity?> findUserByEmail(String email) async {
    final user = await (db.select(db.users)
          ..where((u) => u.email.equals(email.trim().toLowerCase()) & u.deletedAt.isNull()))
        .getSingleOrNull();
    if (user == null) return null;

    final shopId = await findAssignedShopForUser(user.id);
    return UserEntity(
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      globalRole: user.globalRole,
      assignedShopId: shopId,
      hasPinConfigured: user.pinCodeHash != null && user.pinCodeHash!.isNotEmpty,
      mustChangePassword: user.mustChangePassword,
      isActive: user.isActive,
    );
  }

  @override
  Future<UserEntity?> findUserById(String id) async {
    final user = await (db.select(db.users)..where((u) => u.id.equals(id))).getSingleOrNull();
    if (user == null) return null;

    final shopId = await findAssignedShopForUser(user.id);
    return UserEntity(
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      globalRole: user.globalRole,
      assignedShopId: shopId,
      hasPinConfigured: user.pinCodeHash != null && user.pinCodeHash!.isNotEmpty,
      mustChangePassword: user.mustChangePassword,
      isActive: user.isActive,
    );
  }

  @override
  Future<UserEntity> saveSuperAdmin({
    required String id,
    required String email,
    required String firstName,
    required String lastName,
    required String password,
    String? pin,
  }) async {
    final passHash = PasswordHasher.hashPassword(password);
    final pinHash = (pin != null && pin.isNotEmpty) ? PasswordHasher.hashPin(pin) : null;

    final existing = await (db.select(db.users)..where((u) => u.email.equals(email.toLowerCase()))).getSingleOrNull();
    if (existing == null) {
      await db.into(db.users).insert(
            UsersCompanion.insert(
              id: id,
              email: email.toLowerCase(),
              passwordHash: passHash,
              pinCodeHash: Value(pinHash),
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              globalRole: const Value('SUPER_ADMIN'),
              mustChangePassword: const Value(false),
              isActive: const Value(true),
            ),
          );
    }

    final existingCompany = await db.select(db.companySettings).get();
    if (existingCompany.isEmpty) {
      await db.into(db.companySettings).insert(
            CompanySettingsCompanion.insert(
              id: UuidGenerator.v7(),
              companyName: 'Mon Entreprise',
            ),
          );
    }

    return UserEntity(
      id: id,
      email: email,
      firstName: firstName,
      lastName: lastName,
      globalRole: 'SUPER_ADMIN',
      hasPinConfigured: pinHash != null,
      mustChangePassword: false,
      isActive: true,
    );
  }

  @override
  Future<void> updatePassword(String userId, String newPassword) async {
    final passHash = PasswordHasher.hashPassword(newPassword);
    await (db.update(db.users)..where((u) => u.id.equals(userId))).write(
      UsersCompanion(
        passwordHash: Value(passHash),
        mustChangePassword: const Value(false),
        updatedAt: Value(DateTime.now().toUtc()),
      ),
    );
  }

  @override
  Future<void> updatePinCode(String userId, String newPin) async {
    final pinHash = PasswordHasher.hashPin(newPin);
    await (db.update(db.users)..where((u) => u.id.equals(userId))).write(
      UsersCompanion(
        pinCodeHash: Value(pinHash),
        updatedAt: Value(DateTime.now().toUtc()),
      ),
    );
  }

  @override
  Future<List<ShopEntity>> getActiveShops() async {
    final shops = await (db.select(db.shops)..where((s) => s.isActive.equals(true))).get();
    return shops
        .map((s) => ShopEntity(
              id: s.id,
              code: s.code,
              name: s.name,
              address: s.address,
              city: s.city,
              currencySymbol: s.currencySymbol,
              type: s.type,
              isActive: s.isActive,
            ))
        .toList();
  }

  @override
  Future<String?> findAssignedShopForUser(String userId) async {
    final worker = await (db.select(db.workers)..where((w) => w.userId.equals(userId) & w.isActive.equals(true))).getSingleOrNull();
    if (worker?.shopId != null) return worker!.shopId;

    final assignment = await (db.select(db.userShopAssignments)..where((a) => a.userId.equals(userId))).getSingleOrNull();
    return assignment?.shopId;
  }
}
