import 'package:equatable/equatable.dart';

class ShopEntity extends Equatable {
  final String id;
  final String code;
  final String name;
  final String? address;
  final String? city;
  final String currencySymbol;
  final String type;
  final bool isActive;

  const ShopEntity({
    required this.id,
    required this.code,
    required this.name,
    this.address,
    this.city,
    required this.currencySymbol,
    required this.type,
    required this.isActive,
  });

  @override
  List<Object?> get props => [id, code, name, address, city, currencySymbol, type, isActive];
}
