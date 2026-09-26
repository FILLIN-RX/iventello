import '../entities/user_entity.dart';
import '../repositories/auth_repository.dart';

class LoginWithPasswordUseCase {
  final AuthRepository repository;

  const LoginWithPasswordUseCase(this.repository);

  Future<UserEntity> call({
    required String email,
    required String password,
    String? shopId,
  }) {
    return repository.loginWithPassword(
      email: email,
      password: password,
      shopId: shopId,
    );
  }
}
