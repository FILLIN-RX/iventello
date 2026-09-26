import 'package:uuid/uuid.dart';

class UuidGenerator {
  static const _uuid = Uuid();

  /// Génère un identifiant UUIDv7 ordonnançable chronologiquement
  static String v7() => _uuid.v7();
}
