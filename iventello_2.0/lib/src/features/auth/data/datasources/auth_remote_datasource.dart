import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';

abstract class AuthRemoteDataSource {
  Future<Map<String, dynamic>> registerSuperAdmin({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? pin,
  });

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  });

  Future<String> sendResetOtp({required String email});
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient apiClient;

  AuthRemoteDataSourceImpl({ApiClient? apiClient}) : apiClient = apiClient ?? ApiClient();

  @override
  Future<Map<String, dynamic>> registerSuperAdmin({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? pin,
  }) async {
    final response = await apiClient.post(
      ApiEndpoints.registerSuperAdmin,
      body: {
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'password': password,
        'pin': pin,
      },
    );
    return response as Map<String, dynamic>;
  }

  @override
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await apiClient.post(
      ApiEndpoints.login,
      body: {'email': email, 'password': password},
    );
    return response as Map<String, dynamic>;
  }

  @override
  Future<String> sendResetOtp({required String email}) async {
    final response = await apiClient.post(
      ApiEndpoints.sendForgotPasswordCode,
      body: {'email': email},
    );
    final data = response as Map<String, dynamic>;
    return data['debugCode'] ?? 'ENVOYÉ';
  }
}
