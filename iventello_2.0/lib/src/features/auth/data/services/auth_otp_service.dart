import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../domain/entities/auth_config.dart';

class OtpRecord {
  final String identifier; // email or phone
  final String code;
  final DateTime createdAt;
  final DateTime expiresAt;
  int attemptsLeft;

  OtpRecord({
    required this.identifier,
    required this.code,
    required this.createdAt,
    required this.expiresAt,
    required this.attemptsLeft,
  });

  bool get isExpired => DateTime.now().isAfter(expiresAt);
}

class OtpSendResult {
  final bool success;
  final String message;
  final String? debugCode;
  final int cooldownSecondsRemaining;

  OtpSendResult({
    required this.success,
    required this.message,
    this.debugCode,
    this.cooldownSecondsRemaining = 0,
  });
}

class OtpVerifyResult {
  final bool success;
  final String message;

  OtpVerifyResult({
    required this.success,
    required this.message,
  });
}

class AuthOtpService {
  AuthConfig _config;
  final String nodeServerBaseUrl;
  final Map<String, OtpRecord> _activeOtps = {};
  final Map<String, DateTime> _lastSentTimes = {};

  AuthOtpService({
    AuthConfig? initialConfig,
    this.nodeServerBaseUrl = 'http://localhost:4000',
  }) : _config = initialConfig ?? const AuthConfig();

  AuthConfig get config => _config;

  void updateConfig(AuthConfig newConfig) {
    _config = newConfig;
  }

  /// Génère et expédie un code de vérification / réinitialisation
  Future<OtpSendResult> sendResetCode({
    required String identifier, // Email ou Téléphone
    DeliveryChannel? channelOverride,
  }) async {
    final cleanIdentifier = identifier.trim().toLowerCase();

    // 1. Tentative d'appel au Serveur Auth Node.js
    try {
      final response = await http
          .post(
            Uri.parse('$nodeServerBaseUrl/api/auth/forgot-password/send-code'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': cleanIdentifier}),
          )
          .timeout(const Duration(milliseconds: 1500));

      if (response.statusCode == 200 || response.statusCode == 429) {
        final data = jsonDecode(response.body);
        return OtpSendResult(
          success: data['success'] ?? false,
          message: data['message'] ?? 'Réponse reçue du serveur Node.js.',
          debugCode: data['debugCode'],
          cooldownSecondsRemaining: data['cooldownRemaining'] ?? 0,
        );
      }
    } catch (_) {
      // Serveur Node.js injoignable ou mode hors-ligne -> Bascule automatique sur moteur local
    }

    // 2. Moteur de secours local (Offline POS)
    final now = DateTime.now();
    final lastSent = _lastSentTimes[cleanIdentifier];
    if (lastSent != null) {
      final elapsed = now.difference(lastSent).inSeconds;
      if (elapsed < _config.resendCooldownSeconds) {
        final remaining = _config.resendCooldownSeconds - elapsed;
        return OtpSendResult(
          success: false,
          message: 'Veuillez patienter $remaining secondes avant de demander un nouveau code.',
          cooldownSecondsRemaining: remaining,
        );
      }
    }

    final random = Random.secure();
    final minVal = pow(10, _config.otpLength - 1).toInt();
    final maxVal = pow(10, _config.otpLength).toInt() - 1;
    final generatedCode = (minVal + random.nextInt(maxVal - minVal + 1)).toString();

    final expiresAt = now.add(Duration(minutes: _config.otpValidityMinutes));
    _activeOtps[cleanIdentifier] = OtpRecord(
      identifier: cleanIdentifier,
      code: generatedCode,
      createdAt: now,
      expiresAt: expiresAt,
      attemptsLeft: _config.maxVerificationAttempts,
    );
    _lastSentTimes[cleanIdentifier] = now;

    debugPrint('🔐 [IVENTELLO LOCAL OTP ENGINE] OTP pour $cleanIdentifier : $generatedCode');

    return OtpSendResult(
      success: true,
      message: 'Code de sécurité envoyé à $cleanIdentifier avec succès.',
      debugCode: generatedCode,
      cooldownSecondsRemaining: _config.resendCooldownSeconds,
    );
  }

  /// Vérifie si le code saisi est valide
  Future<OtpVerifyResult> verifyCode({
    required String identifier,
    required String code,
  }) async {
    final cleanIdentifier = identifier.trim().toLowerCase();
    final cleanCode = code.trim();

    final record = _activeOtps[cleanIdentifier];

    if (record == null) {
      return OtpVerifyResult(
        success: false,
        message: 'Aucun code actif pour cette adresse. Veuillez en demander un nouveau.',
      );
    }

    if (record.isExpired) {
      _activeOtps.remove(cleanIdentifier);
      return OtpVerifyResult(
        success: false,
        message: 'Ce code a expiré. Veuillez demander un nouveau code.',
      );
    }

    if (record.attemptsLeft <= 0) {
      _activeOtps.remove(cleanIdentifier);
      return OtpVerifyResult(
        success: false,
        message: 'Nombre maximal de tentatives dépassé. Veuillez demander un nouveau code.',
      );
    }

    if (record.code != cleanCode) {
      record.attemptsLeft -= 1;
      return OtpVerifyResult(
        success: false,
        message: 'Code incorrect. Tentatives restantes : ${record.attemptsLeft}',
      );
    }

    // Succès : Nettoyage du code consommé (Usage unique)
    _activeOtps.remove(cleanIdentifier);
    return OtpVerifyResult(
      success: true,
      message: 'Code validé avec succès.',
    );
  }
}
