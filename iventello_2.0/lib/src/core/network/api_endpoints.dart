class ApiEndpoints {
  // Base URLs
  static const String defaultHost = 'http://localhost';
  static const int defaultPort = 4000;
  static String baseUrl = '$defaultHost:$defaultPort/api';

  static void setBaseUrl(String url) {
    baseUrl = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }

  // System & Health
  static String get health => '$baseUrl/health';

  // Authentication Module
  static String get registerSuperAdmin => '$baseUrl/auth/register-superadmin';
  static String get login => '$baseUrl/auth/login';
  static String get sendForgotPasswordCode => '$baseUrl/auth/forgot-password/send-code';
  static String get verifyForgotPasswordCode => '$baseUrl/auth/forgot-password/verify-code';
  static String get resetPassword => '$baseUrl/auth/forgot-password/reset';
  static String get authConfig => '$baseUrl/auth/config';

  // Offline-First Synchronization Module
  static String get syncPush => '$baseUrl/sync/push';
  static String get syncPull => '$baseUrl/sync/pull';
  static String get syncStatus => '$baseUrl/sync/status';

  // Global Config Module (SMTP / SMS / OTP)
  static String get config => '$baseUrl/config';
}
