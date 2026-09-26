import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'network_exceptions.dart';

class ApiClient {
  final http.Client _client;
  final Duration defaultTimeout;

  ApiClient({
    http.Client? client,
    this.defaultTimeout = const Duration(seconds: 5),
  }) : _client = client ?? http.Client();

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  Future<dynamic> get(String url, {Map<String, String>? headers}) async {
    try {
      final response = await _client
          .get(
            Uri.parse(url),
            headers: {..._headers, ...?headers},
          )
          .timeout(defaultTimeout);
      return _processResponse(response);
    } on SocketException {
      throw const OfflineException();
    } on TimeoutException {
      throw const OfflineException('Délai d\'attente dépassé lors de la connexion au serveur.');
    } catch (e) {
      if (e is NetworkException) rethrow;
      throw OfflineException(e.toString());
    }
  }

  Future<dynamic> post(String url, {dynamic body, Map<String, String>? headers}) async {
    try {
      final response = await _client
          .post(
            Uri.parse(url),
            headers: {..._headers, ...?headers},
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(defaultTimeout);
      return _processResponse(response);
    } on SocketException {
      throw const OfflineException();
    } on TimeoutException {
      throw const OfflineException('Délai d\'attente dépassé lors de la connexion au serveur.');
    } catch (e) {
      if (e is NetworkException) rethrow;
      throw OfflineException(e.toString());
    }
  }

  Future<dynamic> put(String url, {dynamic body, Map<String, String>? headers}) async {
    try {
      final response = await _client
          .put(
            Uri.parse(url),
            headers: {..._headers, ...?headers},
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(defaultTimeout);
      return _processResponse(response);
    } on SocketException {
      throw const OfflineException();
    } on TimeoutException {
      throw const OfflineException('Délai d\'attente dépassé lors de la connexion au serveur.');
    } catch (e) {
      if (e is NetworkException) rethrow;
      throw OfflineException(e.toString());
    }
  }

  dynamic _processResponse(http.Response response) {
    dynamic bodyJson;
    try {
      bodyJson = jsonDecode(response.body);
    } catch (_) {
      bodyJson = {'message': response.body};
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return bodyJson;
    } else if (response.statusCode == 401 || response.statusCode == 403) {
      throw UnauthorizedException(bodyJson?['message'] ?? 'Accès non autorisé.');
    } else {
      throw ServerException(
        bodyJson?['message'] ?? 'Erreur du serveur (Code: ${response.statusCode})',
        statusCode: response.statusCode,
      );
    }
  }
}
