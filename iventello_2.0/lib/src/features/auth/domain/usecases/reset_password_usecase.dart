import '../repositories/auth_repository.dart';

class ResetPasswordUseCase {
  final AuthRepository repository;

  const ResetPasswordUseCase(this.repository);

  Future<void> call({
    required String email,
    required String pinOrCode,
    required String newPassword,
  }) {
    return repository.resetPasswordWithPinOrCode(
      email: email,
      pinOrCode: pinOrCode,
      newPassword: newPassword,
    );
  }
}
