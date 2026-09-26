import '../repositories/auth_repository.dart';

class SendPasswordResetOtpUseCase {
  final AuthRepository repository;

  const SendPasswordResetOtpUseCase(this.repository);

  Future<String> call({required String email}) {
    return repository.sendPasswordResetOtp(email: email);
  }
}
