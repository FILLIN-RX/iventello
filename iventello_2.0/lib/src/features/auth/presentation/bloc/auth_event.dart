import 'package:equatable/equatable.dart';
import '../../domain/entities/shop_entity.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();
  @override
  List<Object?> get props => [];
}

class CheckAuthSessionEvent extends AuthEvent {}

class RegisterSuperAdminEvent extends AuthEvent {
  final String firstName;
  final String lastName;
  final String email;
  final String password;
  final String? pin;

  const RegisterSuperAdminEvent({
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.password,
    this.pin,
  });

  @override
  List<Object?> get props => [firstName, lastName, email, password, pin];
}

class CompleteInitialSetupEvent extends AuthEvent {
  final String adminFirstName;
  final String adminLastName;
  final String adminEmail;
  final String adminPassword;
  final String adminPin;
  final String companyName;
  final String currencySymbol;
  final String warehouseTopology;
  final String initialShopName;
  final String initialShopCode;
  final String initialShopCity;

  const CompleteInitialSetupEvent({
    required this.adminFirstName,
    required this.adminLastName,
    required this.adminEmail,
    required this.adminPassword,
    required this.adminPin,
    required this.companyName,
    required this.currencySymbol,
    required this.warehouseTopology,
    required this.initialShopName,
    required this.initialShopCode,
    required this.initialShopCity,
  });

  @override
  List<Object?> get props => [
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPassword,
        adminPin,
        companyName,
        currencySymbol,
        warehouseTopology,
        initialShopName,
        initialShopCode,
        initialShopCity,
      ];
}

class CreateShopEvent extends AuthEvent {
  final String name;
  final String code;
  final String city;
  final String address;
  final String phone;
  final String currencySymbol;
  final double defaultVatRate;
  final String receiptHeader;
  final String receiptFooter;
  final String type;

  const CreateShopEvent({
    required this.name,
    required this.code,
    required this.city,
    this.address = '',
    this.phone = '',
    required this.currencySymbol,
    this.defaultVatRate = 19.25,
    this.receiptHeader = '',
    this.receiptFooter = '',
    this.type = 'BOUTIQUE_VENTE',
  });

  @override
  List<Object?> get props => [name, code, city, address, phone, currencySymbol, defaultVatRate, receiptHeader, receiptFooter, type];
}

class SelectActiveShopEvent extends AuthEvent {
  final ShopEntity shop;

  const SelectActiveShopEvent(this.shop);

  @override
  List<Object?> get props => [shop];
}

class LoginWithPasswordEvent extends AuthEvent {
  final String email;
  final String password;
  final String? shopId;

  const LoginWithPasswordEvent({
    required this.email,
    required this.password,
    this.shopId,
  });

  @override
  List<Object?> get props => [email, password, shopId];
}

class UnlockWithPinEvent extends AuthEvent {
  final String pin;

  const UnlockWithPinEvent({required this.pin});

  @override
  List<Object?> get props => [pin];
}

class LockSessionEvent extends AuthEvent {}

class LogoutEvent extends AuthEvent {}

class UpdatePasswordEvent extends AuthEvent {
  final String newPassword;

  const UpdatePasswordEvent({required this.newPassword});

  @override
  List<Object?> get props => [newPassword];
}

class SetPinCodeEvent extends AuthEvent {
  final String pin;

  const SetPinCodeEvent({required this.pin});

  @override
  List<Object?> get props => [pin];
}

class SendPasswordResetOtpEvent extends AuthEvent {
  final String email;

  const SendPasswordResetOtpEvent({required this.email});

  @override
  List<Object?> get props => [email];
}

class ResetPasswordWithPinOrCodeEvent extends AuthEvent {
  final String email;
  final String pinOrCode;
  final String newPassword;

  const ResetPasswordWithPinOrCodeEvent({
    required this.email,
    required this.pinOrCode,
    required this.newPassword,
  });

  @override
  List<Object?> get props => [email, pinOrCode, newPassword];
}
