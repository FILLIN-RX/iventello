import 'package:equatable/equatable.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/entities/shop_entity.dart';

enum AuthStatus {
  initial,
  loading,
  needsOnboarding,  // Première ouverture : aucun compte n'existe encore
  needsSetup,       // Admin enregistré + auto-login → doit configurer sa boutique
  unauthenticated,
  authenticated,
  locked,
  mustChangePassword,
  error,
}

class AuthState extends Equatable {
  final AuthStatus status;
  final UserEntity? currentUser;
  final ShopEntity? activeShop;
  final List<ShopEntity> availableShops;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.initial,
    this.currentUser,
    this.activeShop,
    this.availableShops = const [],
    this.errorMessage,
  });

  bool get isAuthenticated => status == AuthStatus.authenticated && currentUser != null && activeShop != null;
  bool get isLocked => status == AuthStatus.locked;
  bool get isSuperAdmin => currentUser?.isSuperAdmin ?? false;

  AuthState copyWith({
    AuthStatus? status,
    UserEntity? currentUser,
    ShopEntity? activeShop,
    List<ShopEntity>? availableShops,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      currentUser: currentUser ?? this.currentUser,
      activeShop: activeShop ?? this.activeShop,
      availableShops: availableShops ?? this.availableShops,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, currentUser, activeShop, availableShops, errorMessage];
}
