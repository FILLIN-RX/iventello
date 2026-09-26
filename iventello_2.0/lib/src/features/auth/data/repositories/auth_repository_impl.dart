import 'dart:async';
import 'package:drift/drift.dart';
import '../../../../core/database/app_database.dart';
import '../../../../core/utils/password_hasher.dart';
import '../../../../core/utils/uuid_generator.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/entities/shop_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_local_datasource.dart';
import '../datasources/auth_remote_datasource.dart';
import '../services/auth_otp_service.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AppDatabase db;
  final AuthLocalDataSource localDataSource;
  final AuthRemoteDataSource remoteDataSource;
  final AuthOtpService otpService;

  AuthRepositoryImpl({
    required this.db,
    AuthLocalDataSource? localDataSource,
    AuthRemoteDataSource? remoteDataSource,
    AuthOtpService? otpService,
  })  : localDataSource = localDataSource ?? AuthLocalDataSourceImpl(db),
        remoteDataSource = remoteDataSource ?? AuthRemoteDataSourceImpl(),
        otpService = otpService ?? AuthOtpService();

  @override
  Future<bool> hasExistingAccounts() => localDataSource.hasUsers();

  @override
  Future<UserEntity> registerSuperAdminAccount({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? pin,
  }) async {
    final cleanEmail = email.trim().toLowerCase();

    if (password.length < 6) {
      throw Exception("Le mot de passe doit comporter au moins 6 caractères.");
    }

    // 1. Appel OBLIGATOIRE au Serveur Backend Node.js en ligne
    final remoteData = await remoteDataSource.registerSuperAdmin(
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      password: password,
      pin: pin?.trim(),
    );

    final serverUser = remoteData['data']?['user'];
    final adminId = serverUser?['id'] ?? UuidGenerator.v7();

    // 2. Persistance locale dans SQLite pour permettre le fonctionnement hors-ligne par la suite
    return localDataSource.saveSuperAdmin(
      id: adminId,
      email: cleanEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      password: password,
      pin: pin?.trim(),
    );
  }

  @override
  Future<UserEntity> completeInitialSetup({
    required String adminFirstName,
    required String adminLastName,
    required String adminEmail,
    required String adminPassword,
    required String adminPin,
    required String companyName,
    required String currencySymbol,
    required String warehouseTopology,
    required String initialShopName,
    required String initialShopCode,
    required String initialShopCity,
  }) async {
    final adminId = UuidGenerator.v7();
    final shopId = UuidGenerator.v7();
    final companyId = UuidGenerator.v7();

    // 1. Création de la configuration Entreprise
    await db.into(db.companySettings).insert(
          CompanySettingsCompanion.insert(
            id: companyId,
            companyName: companyName.trim(),
            warehouseTopology: Value(warehouseTopology),
          ),
        );

    // 2. Création de la première Boutique
    await db.into(db.shops).insert(
          ShopsCompanion.insert(
            id: shopId,
            code: initialShopCode.trim().toUpperCase(),
            name: initialShopName.trim(),
            city: Value(initialShopCity.trim()),
            currencySymbol: Value(currencySymbol.trim()),
            receiptHeader: Value('$companyName\n$initialShopName\nBienvenue !'),
            receiptFooter: const Value('Merci de votre visite et à bientôt !'),
          ),
        );

    // 3. Création du compte Super Administrateur
    await db.into(db.users).insert(
          UsersCompanion.insert(
            id: adminId,
            email: adminEmail.trim().toLowerCase(),
            passwordHash: PasswordHasher.hashPassword(adminPassword),
            pinCodeHash: Value(PasswordHasher.hashPin(adminPin)),
            firstName: adminFirstName.trim(),
            lastName: adminLastName.trim(),
            globalRole: const Value('SUPER_ADMIN'),
            mustChangePassword: const Value(false),
          ),
        );

    // 4. Attribution de tous les droits sur la boutique initiale
    await db.into(db.userShopAssignments).insert(
          UserShopAssignmentsCompanion.insert(
            id: UuidGenerator.v7(),
            userId: adminId,
            shopId: shopId,
            role: const Value('GERANT_BOUTIQUE'),
            canOpenDrawerWithoutSale: const Value(true),
            canCancelTicket: const Value(true),
            canPerformInventory: const Value(true),
            canInitiateTransfer: const Value(true),
          ),
        );

    return UserEntity(
      id: adminId,
      email: adminEmail.trim().toLowerCase(),
      firstName: adminFirstName.trim(),
      lastName: adminLastName.trim(),
      globalRole: 'SUPER_ADMIN',
      hasPinConfigured: true,
      mustChangePassword: false,
      isActive: true,
    );
  }

  @override
  Future<ShopEntity> createShop({
    required String name,
    required String code,
    required String city,
    required String address,
    required String phone,
    required String currencySymbol,
    required double defaultVatRate,
    required String receiptHeader,
    required String receiptFooter,
    required String type,
  }) async {
    final shopId = UuidGenerator.v7();
    final cleanCode = code.trim().toUpperCase();

    await db.into(db.shops).insert(
          ShopsCompanion.insert(
            id: shopId,
            code: cleanCode,
            name: name.trim(),
            city: Value(city.trim()),
            address: Value(address.trim()),
            phone: Value(phone.trim()),
            currencySymbol: Value(currencySymbol.trim()),
            defaultVatRate: Value(defaultVatRate),
            receiptHeader: Value(receiptHeader.trim()),
            receiptFooter: Value(receiptFooter.trim()),
            type: Value(type),
          ),
        );

    // Attribution automatique aux SuperAdmins
    final superAdmins = await (db.select(db.users)..where((u) => u.globalRole.equals('SUPER_ADMIN'))).get();
    for (final admin in superAdmins) {
      await db.into(db.userShopAssignments).insert(
            UserShopAssignmentsCompanion.insert(
              id: UuidGenerator.v7(),
              userId: admin.id,
              shopId: shopId,
              role: const Value('GERANT_BOUTIQUE'),
              canOpenDrawerWithoutSale: const Value(true),
              canCancelTicket: const Value(true),
              canPerformInventory: const Value(true),
              canInitiateTransfer: const Value(true),
            ),
          );
    }

    return ShopEntity(
      id: shopId,
      code: cleanCode,
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      currencySymbol: currencySymbol.trim(),
      type: type,
      isActive: true,
    );
  }

  @override
  Future<UserEntity> loginWithPassword({
    required String email,
    required String password,
    String? shopId,
  }) async {
    final query = db.select(db.users)..where((u) => u.email.equals(email.trim().toLowerCase()) & u.deletedAt.isNull());
    final user = await query.getSingleOrNull();

    if (user == null) {
      throw Exception("Adresse email introuvable ou compte désactivé.");
    }

    if (!user.isActive) {
      throw Exception("Ce compte utilisateur a été suspendu.");
    }

    final isPasswordValid = PasswordHasher.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw Exception("Mot de passe incorrect.");
    }

    String? detectedShopId = shopId;

    if (user.globalRole != 'SUPER_ADMIN') {
      // 1. Recherche dans la table Workers
      final worker = await (db.select(db.workers)..where((w) => w.userId.equals(user.id) & w.isActive.equals(true))).getSingleOrNull();
      if (worker != null && worker.shopId != null) {
        detectedShopId = worker.shopId;
      } else {
        // 2. Recherche dans UserShopAssignments
        final assignment = await (db.select(db.userShopAssignments)..where((a) => a.userId.equals(user.id))).getSingleOrNull();
        if (assignment != null) {
          detectedShopId = assignment.shopId;
        }
      }

      if (detectedShopId == null) {
        // Recherche d'une boutique active par défaut
        final firstShop = await (db.select(db.shops)..where((s) => s.isActive.equals(true))).getSingleOrNull();
        detectedShopId = firstShop?.id;
      }
    }

    await (db.update(db.users)..where((u) => u.id.equals(user.id))).write(
      UsersCompanion(lastLoginAt: Value(DateTime.now().toUtc())),
    );

    return UserEntity(
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      globalRole: user.globalRole,
      assignedShopId: detectedShopId,
      hasPinConfigured: user.pinCodeHash != null && user.pinCodeHash!.isNotEmpty,
      mustChangePassword: user.mustChangePassword,
      isActive: user.isActive,
    );
  }

  @override
  Future<UserEntity> unlockWithPin({
    required String userId,
    required String pin,
    String? shopId,
  }) async {
    final user = await (db.select(db.users)..where((u) => u.id.equals(userId))).getSingleOrNull();
    if (user == null || !user.isActive) {
      throw Exception("Utilisateur introuvable ou inactif.");
    }

    if (user.pinCodeHash == null || user.pinCodeHash!.isEmpty) {
      throw Exception("Aucun code PIN configuré.");
    }

    final isPinValid = PasswordHasher.verifyPin(pin, user.pinCodeHash!);
    if (!isPinValid) {
      throw Exception("Code PIN incorrect.");
    }

    String? detectedShopId = shopId;
    if (user.globalRole != 'SUPER_ADMIN') {
      final worker = await (db.select(db.workers)..where((w) => w.userId.equals(user.id) & w.isActive.equals(true))).getSingleOrNull();
      detectedShopId = worker?.shopId;
    }

    return UserEntity(
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      globalRole: user.globalRole,
      assignedShopId: detectedShopId,
      hasPinConfigured: true,
      mustChangePassword: user.mustChangePassword,
      isActive: user.isActive,
    );
  }

  @override
  Future<void> setPinCode({required String userId, required String newPin}) async {
    if (newPin.length < 4 || newPin.length > 6) {
      throw Exception("Le code PIN doit comporter 4 à 6 chiffres.");
    }
    final pinHash = PasswordHasher.hashPin(newPin);
    await (db.update(db.users)..where((u) => u.id.equals(userId))).write(
      UsersCompanion(
        pinCodeHash: Value(pinHash),
        updatedAt: Value(DateTime.now().toUtc()),
      ),
    );
  }

  @override
  Future<void> updatePassword({required String userId, required String newPassword}) async {
    if (newPassword.length < 6) {
      throw Exception("Le mot de passe doit comporter au moins 6 caractères.");
    }
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
  Future<String> sendPasswordResetOtp({required String email}) async {
    final cleanEmail = email.trim().toLowerCase();
    final user = await (db.select(db.users)..where((u) => u.email.equals(cleanEmail))).getSingleOrNull();
    if (user == null) {
      throw Exception("Aucun compte associé à cette adresse email.");
    }

    final result = await otpService.sendResetCode(identifier: cleanEmail);
    if (!result.success) {
      throw Exception(result.message);
    }

    return result.debugCode ?? 'ENVOYÉ';
  }

  @override
  Future<void> resetPasswordWithPinOrCode({
    required String email,
    required String pinOrCode,
    required String newPassword,
  }) async {
    final cleanEmail = email.trim().toLowerCase();
    final user = await (db.select(db.users)..where((u) => u.email.equals(cleanEmail))).getSingleOrNull();
    if (user == null) {
      throw Exception("Aucun compte associé à cette adresse email.");
    }

    if (newPassword.length < 6) {
      throw Exception("Le nouveau mot de passe doit comporter au moins 6 caractères.");
    }

    // 1. Essai de validation via OTP Service
    final otpResult = await otpService.verifyCode(identifier: cleanEmail, code: pinOrCode);
    bool isValid = otpResult.success;

    // 2. Si OTP n'a pas validé, vérifier avec le code PIN de sécurité enregistré du compte
    if (!isValid) {
      final isPinValid = user.pinCodeHash != null && PasswordHasher.verifyPin(pinOrCode.trim(), user.pinCodeHash!);
      if (isPinValid) {
        isValid = true;
      }
    }

    if (!isValid) {
      throw Exception(otpResult.message.isNotEmpty ? otpResult.message : "Code de sécurité ou code PIN invalide.");
    }

    final newPassHash = PasswordHasher.hashPassword(newPassword);
    await (db.update(db.users)..where((u) => u.id.equals(user.id))).write(
      UsersCompanion(
        passwordHash: Value(newPassHash),
        mustChangePassword: const Value(false),
        updatedAt: Value(DateTime.now().toUtc()),
      ),
    );
  }

  @override
  Future<List<ShopEntity>> getAvailableShops() async {
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
}
