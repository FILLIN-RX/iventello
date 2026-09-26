import '../entities/user_entity.dart';
import '../entities/shop_entity.dart';

abstract class AuthRepository {
  /// Vérifie si l'application possède déjà au moins un utilisateur et une boutique
  Future<bool> hasExistingAccounts();

  /// Création directe du compte Super-Administrateur
  Future<UserEntity> registerSuperAdminAccount({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? pin,
  });

  /// Initialisation complète de l'application (Optionnelle)
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
  });

  /// Création d'une nouvelle boutique par le SuperAdmin
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
  });

  /// Authentification standard par email et mot de passe (détection automatique de l'utilisateur et boutique)
  Future<UserEntity> loginWithPassword({
    required String email,
    required String password,
    String? shopId,
  });

  /// Déverrouillage rapide par Code PIN (en caisse)
  Future<UserEntity> unlockWithPin({
    required String userId,
    required String pin,
    String? shopId,
  });

  /// Configuration du code PIN de caisse
  Future<void> setPinCode({
    required String userId,
    required String newPin,
  });

  /// Changement obligatoire de mot de passe
  Future<void> updatePassword({
    required String userId,
    required String newPassword,
  });

  /// Envoi d'un code OTP sécurisé par email / SMS
  Future<String> sendPasswordResetOtp({required String email});

  /// Réinitialisation de mot de passe oublié (via code PIN de sécurité ou OTP)
  Future<void> resetPasswordWithPinOrCode({
    required String email,
    required String pinOrCode,
    required String newPassword,
  });

  /// Récupération de la liste des boutiques actives
  Future<List<ShopEntity>> getAvailableShops();
}
