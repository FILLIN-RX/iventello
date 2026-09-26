import '../entities/user_entity.dart';
import '../repositories/auth_repository.dart';

class RegisterSuperAdminUseCase {
  final AuthRepository repository;

  const RegisterSuperAdminUseCase(this.repository);

  Future<UserEntity> call({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? pin,
  }) {
    return repository.registerSuperAdminAccount(
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: password,
      pin: pin,
    );
  }
}
