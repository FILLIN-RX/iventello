import 'dart:typed_data';

class PrintableItem {
  final String name;
  final int quantity;
  final BigInt priceCents;

  const PrintableItem({
    required this.name,
    required this.quantity,
    required this.priceCents,
  });
}

class ReceiptPayload {
  final String storeName;
  final String cashierName;
  final String ticketId;
  final List<PrintableItem> items;
  final BigInt totalCents;

  const ReceiptPayload({
    required this.storeName,
    required this.cashierName,
    required this.ticketId,
    required this.items,
    required this.totalCents,
  });
}

/// Interface miroir de la fonction native Rust
Future<Uint8List> generateEscposReceipt({required ReceiptPayload payload}) async {
  final buffer = BytesBuilder();
  buffer.add([0x1B, 0x40]); // Init
  buffer.add([0x1B, 0x61, 0x01]); // Alignement centré
  buffer.add([0x1D, 0x21, 0x11]); // Double hauteur/largeur
  buffer.add(payload.storeName.codeUnits);
  buffer.add([0x0A]);
  buffer.add([0x1D, 0x21, 0x00]);
  buffer.add('Ticket: ${payload.ticketId}\n'.codeUnits);
  buffer.add('Caissier: ${payload.cashierName}\n'.codeUnits);
  buffer.add('--------------------------------\n'.codeUnits);
  buffer.add([0x1B, 0x61, 0x00]);

  for (final item in payload.items) {
    final name = item.name.length > 16 ? item.name.substring(0, 16) : item.name.padRight(16);
    final price = (item.priceCents.toInt() / 100).toStringAsFixed(0);
    buffer.add('$name x${item.quantity} ${price.padLeft(8)} FCFA\n'.codeUnits);
  }

  buffer.add('--------------------------------\n'.codeUnits);
  buffer.add([0x1B, 0x61, 0x02]);
  buffer.add([0x1B, 0x45, 0x01]);
  buffer.add('TOTAL: ${(payload.totalCents.toInt() / 100).toStringAsFixed(0)} FCFA\n\n'.codeUnits);
  buffer.add([0x1B, 0x45, 0x00]);
  buffer.add([0x1B, 0x61, 0x01]);
  buffer.add('Merci de votre visite !\n\n\n'.codeUnits);
  buffer.add([0x1D, 0x56, 0x42, 0x00]); // Cut

  return buffer.toBytes();
}
