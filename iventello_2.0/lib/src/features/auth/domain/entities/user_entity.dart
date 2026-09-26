import 'package:equatable/equatable.dart';

class UserEntity extends Equatable {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? phone;
  final String? avatarUrl;
  final String globalRole; // 'SUPER_ADMIN' | 'GERANT' | 'CHEF_RAYON' | 'CAISSIER' | 'AGENT_COMMERCIAL'
  final String? assignedShopId;
  final bool hasPinConfigured;
  final bool mustChangePassword;
  final bool isActive;

  const UserEntity({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.phone,
    this.avatarUrl,
    required this.globalRole,
    this.assignedShopId,
    required this.hasPinConfigured,
    required this.mustChangePassword,
    required this.isActive,
  });

  String get fullName => '$firstName $lastName'.trim();
  bool get isSuperAdmin => globalRole == 'SUPER_ADMIN';
  bool get isManager => globalRole == 'GERANT' || isSuperAdmin;

  @override
  List<Object?> get props => [
        id,
        email,
        firstName,
        lastName,
        phone,
        avatarUrl,
        globalRole,
        assignedShopId,
        hasPinConfigured,
        mustChangePassword,
        isActive,
      ];
}
