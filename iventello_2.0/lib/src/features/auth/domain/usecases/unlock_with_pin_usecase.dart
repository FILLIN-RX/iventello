import '../entities/user_entity.dart';
import '../repositories/auth_repository.dart';

class UnlockWithPinUseCase {
  final AuthRepository repository;

  const UnlockWithPinUseCase(this.repository);

  Future<UserEntity> call({
    required String userId,
    required String pin,
    String? shopId,
  }) {
    return repository.unlockWithPin(
      userId: userId,
      pin: pin,
      shopId: shopId,
    );
  }
}
