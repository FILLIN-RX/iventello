class NetworkException implements Exception {
  final String message;
  final int? statusCode;

  const NetworkException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class OfflineException extends NetworkException {
  const OfflineException([
    String message =
        'Connexion requise : Impossible de joindre le serveur. Veuillez vérifier votre connexion Internet ou vous assurer que le serveur Node.js est démarré.',
  ]) : super(message, statusCode: 0);
}

class ServerException extends NetworkException {
  const ServerException(super.message, {super.statusCode});
}

class UnauthorizedException extends NetworkException {
  const UnauthorizedException([super.message = 'Identifiants invalides ou session expirée.'])
      : super(statusCode: 401);
}
