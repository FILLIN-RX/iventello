import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/shop_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository authRepository;

  AuthBloc({required this.authRepository}) : super(const AuthState()) {
    on<CheckAuthSessionEvent>(_onCheckAuthSession);
    on<RegisterSuperAdminEvent>(_onRegisterSuperAdmin);
    on<CompleteInitialSetupEvent>(_onCompleteInitialSetup);
    on<CreateShopEvent>(_onCreateShop);
    on<SelectActiveShopEvent>(_onSelectActiveShop);
    on<LoginWithPasswordEvent>(_onLoginWithPassword);
    on<UnlockWithPinEvent>(_onUnlockWithPin);
    on<LockSessionEvent>(_onLockSession);
    on<LogoutEvent>(_onLogout);
    on<UpdatePasswordEvent>(_onUpdatePassword);
    on<SetPinCodeEvent>(_onSetPinCode);
    on<SendPasswordResetOtpEvent>(_onSendPasswordResetOtp);
    on<ResetPasswordWithPinOrCodeEvent>(_onResetPasswordWithPinOrCode);
  }

  Future<void> _onRegisterSuperAdmin(RegisterSuperAdminEvent event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading, errorMessage: null));
    try {
      final user = await authRepository.registerSuperAdminAccount(
        firstName: event.firstName,
        lastName: event.lastName,
        email: event.email,
        password: event.password,
        pin: event.pin,
      );

      // Auto-login : admin enregistré → redirigé vers la config boutique
      emit(state.copyWith(
        status: AuthStatus.needsSetup,
        currentUser: user,
        availableShops: const [],
        activeShop: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: e.toString().replaceAll("Exception: ", ""),
      ));
    }
  }


  Future<void> _onCheckAuthSession(CheckAuthSessionEvent event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      final hasAccounts = await authRepository.hasExistingAccounts();
      if (!hasAccounts) {
        emit(state.copyWith(status: AuthStatus.needsOnboarding));
        return;
      }

      final shops = await authRepository.getAvailableShops();
      emit(state.copyWith(
        status: AuthStatus.unauthenticated,
        availableShops: shops,
        activeShop: shops.isNotEmpty ? shops.first : null,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: AuthStatus.error,
        errorMessage: e.toString(),
      ));
    }
  }

  Future<void> _onCompleteInitialSetup(CompleteInitialSetupEvent event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading, errorMessage: null));
    try {
      final adminUser = await authRepository.completeInitialSetup(
        adminFirstName: event.adminFirstName,
        adminLastName: event.adminLastName,
        adminEmail: event.adminEmail,
        adminPassword: event.adminPassword,
        adminPin: event.adminPin,
        companyName: event.companyName,
        currencySymbol: event.currencySymbol,
        warehouseTopology: event.warehouseTopology,
        initialShopName: event.initialShopName,
        initialShopCode: event.initialShopCode,
        initialShopCity: event.initialShopCity,
      );

      final shops = await authRepository.getAvailableShops();
      emit(state.copyWith(
        status: AuthStatus.authenticated,
        currentUser: adminUser,
        availableShops: shops,
        activeShop: shops.isNotEmpty ? shops.first : null,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: AuthStatus.needsOnboarding,
        errorMessage: e.toString().replaceAll("Exception: ", ""),
      ));
    }
  }

  Future<void> _onCreateShop(CreateShopEvent event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading, errorMessage: null));
    try {
      final newShop = await authRepository.createShop(
        name: event.name,
        code: event.code,
        city: event.city,
        address: event.address,
        phone: event.phone,
        currencySymbol: event.currencySymbol,
        defaultVatRate: event.defaultVatRate,
        receiptHeader: event.receiptHeader,
        receiptFooter: event.receiptFooter,
        type: event.type,
      );

      final updatedShops = await authRepository.getAvailableShops();
      emit(state.copyWith(
        status: AuthStatus.authenticated,
        availableShops: updatedShops,
        activeShop: newShop,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: AuthStatus.authenticated,
        errorMessage: e.toString().replaceAll("Exception: ", ""),
      ));
    }
  }

  void _onSelectActiveShop(SelectActiveShopEvent event, Emitter<AuthState> emit) {
    emit(state.copyWith(activeShop: event.shop));
  }

  Future<void> _onLoginWithPassword(LoginWithPasswordEvent event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading, errorMessage: null));
    try {
      final user = await authRepository.loginWithPassword(
        email: event.email,
        password: event.password,
        shopId: event.shopId,
      );

      final shops = await authRepository.getAvailableShops();

      ShopEntity? targetShop;
      if (user.assignedShopId != null) {
        targetShop = shops.where((s) => s.id == user.assignedShopId).firstOrNull;
      }
      targetShop ??= shops.where((s) => s.id == event.shopId).firstOrNull;
      targetShop ??= shops.isNotEmpty ? shops.first : null;

      if (user.mustChangePassword) {
        emit(state.copyWith(
          status: AuthStatus.mustChangePassword,
          currentUser: user,
          availableShops: shops,
          activeShop: targetShop,
        ));
      } else {
        emit(state.copyWith(
          status: AuthStatus.authenticated,
          currentUser: user,
          availableShops: shops,
          activeShop: targetShop,
        ));
      }
    } catch (e) {
      emit(state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: e.toString().replaceAll("Exception: ", ""),
      ));
    }
  }

  Future<void> _onUnlockWithPin(UnlockWithPinEvent event, Emitter<AuthState> emit) async {
    if (state.currentUser == null || state.activeShop == null) {
      emit(state.copyWith(status: AuthStatus.unauthenticated));
      return;
    }

    emit(state.copyWith(status: AuthStatus.loading, errorMessage: null));
    try {
      final user = await authRepository.unlockWithPin(
        userId: state.currentUser!.id,
        pin: event.pin,
        shopId: state.activeShop!.id,
      );

      emit(state.copyWith(
        status: AuthStatus.authenticated,
        currentUser: user,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: AuthStatus.locked,
        errorMessage: e.toString().replaceAll("Exception: ", ""),
      ));
    }
  }

  void _onLockSession(LockSessionEvent event, Emitter<AuthState> emit) {
    if (state.currentUser != null) {
      emit(state.copyWith(status: AuthStatus.locked));
    }
  }

  void _onLogout(LogoutEvent event, Emitter<AuthState> emit) {
    emit(state.copyWith(
      status: AuthStatus.unauthenticated,
      currentUser: null,
      errorMessage: null,
    ));
  }

  Future<void> _onUpdatePassword(UpdatePasswordEvent event, Emitter<AuthState> emit) async {
    if (state.currentUser == null) return;
    try {
      await authRepository.updatePassword(
        userId: state.currentUser!.id,
        newPassword: event.newPassword,
      );
      emit(state.copyWith(status: AuthStatus.authenticated));
    } catch (e) {
      emit(state.copyWith(errorMessage: e.toString().replaceAll("Exception: ", "")));
    }
  }

  Future<void> _onSetPinCode(SetPinCodeEvent event, Emitter<AuthState> emit) async {
    if (state.currentUser == null) return;
    try {
      await authRepository.setPinCode(
        userId: state.currentUser!.id,
        newPin: event.pin,
      );
    } catch (e) {
      emit(state.copyWith(errorMessage: e.toString().replaceAll("Exception: ", "")));
    }
  }

  Future<void> _onSendPasswordResetOtp(
    SendPasswordResetOtpEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(status: AuthStatus.loading, errorMessage: null));
    try {
      final debugCode = await authRepository.sendPasswordResetOtp(
        email: event.email,
      );
      emit(state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: "Code de sécurité envoyé avec succès à ${event.email} (Code: $debugCode)",
      ));
    } catch (e) {
      emit(state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: e.toString().replaceAll("Exception: ", ""),
      ));
    }
  }

  Future<void> _onResetPasswordWithPinOrCode(
    ResetPasswordWithPinOrCodeEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(status: AuthStatus.loading, errorMessage: null));
    try {
      await authRepository.resetPasswordWithPinOrCode(
        email: event.email,
        pinOrCode: event.pinOrCode,
        newPassword: event.newPassword,
      );
      emit(state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: "Mot de passe mis à jour avec succès. Veuillez vous connecter.",
      ));
    } catch (e) {
      emit(state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: e.toString().replaceAll("Exception: ", ""),
      ));
    }
  }
}
