import 'dart:convert';
import 'package:crypto/crypto.dart';

class PasswordHasher {
  static const String _salt = 'iventello_enterprise_2_0_secure_salt_';

  /// Hash sécurisé pour les mots de passe utilisateurs
  static String hashPassword(String password) {
    final bytes = utf8.encode('$_salt$password');
    return sha256.convert(bytes).toString();
  }

  /// Hash sécurisé pour le code PIN de caisse
  static String hashPin(String pin) {
    final bytes = utf8.encode('pin_${_salt}_$pin');
    return sha256.convert(bytes).toString();
  }

  /// Vérification de conformité mot de passe
  static bool verifyPassword(String plainPassword, String storedHash) {
    return hashPassword(plainPassword) == storedHash;
  }

  /// Vérification de conformité code PIN
  static bool verifyPin(String plainPin, String storedPinHash) {
    return hashPin(plainPin) == storedPinHash;
  }
}
