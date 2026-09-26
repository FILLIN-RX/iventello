import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/product_entity.dart';
import '../bloc/catalogue_bloc.dart';
import '../bloc/catalogue_bloc_events_states.dart';

/// ─────────────────────────────────────────────────────
///  Fiche Produit — Layout Bento Grid adaptatif
///  Desktop : grille 3 colonnes
///  Mobile  : vue empilée verticalement
/// ─────────────────────────────────────────────────────
class ProductFormScreen extends StatefulWidget {
  final String shopId;
  final ProductEntity? product; // null = création

  const ProductFormScreen({
    super.key,
    required this.shopId,
    this.product,
  });

  @override
  State<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends State<ProductFormScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  // ── Contrôleurs des champs principaux ────────────
  final _nameCtrl = TextEditingController();
  final _barcodeCtrl = TextEditingController();
  final _skuCtrl = TextEditingController();
  final _basePriceCtrl = TextEditingController();
  final _sellingPriceCtrl = TextEditingController();
  final _vatCtrl = TextEditingController(text: '19.25');
  final _stockCtrl = TextEditingController(text: '0');
  final _alertLimitCtrl = TextEditingController(text: '5');
  final _shelfCtrl = TextEditingController();
  final _itemsPerPacketCtrl = TextEditingController(text: '1');
  final _unitPriceCtrl = TextEditingController();

  // ── Contrôleurs des 10 attributs personnalisables ─
  late final List<TextEditingController> _fieldLabelCtrls;
  late final List<TextEditingController> _fieldValueCtrls;

  // ── État local ───────────────────────────────────
  bool _isPacket = false;
  double _vatRate = 19.25;
  String? _selectedCategoryId;
  String? _selectedSupplierId;

  bool get _isEdit => widget.product != null;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);

    // Initialiser les 10 attributs
    _fieldLabelCtrls = List.generate(10, (i) => TextEditingController());
    _fieldValueCtrls = List.generate(10, (i) => TextEditingController());

    if (_isEdit) _prefill(widget.product!);
  }

  void _prefill(ProductEntity p) {
    _nameCtrl.text = p.name;
    _barcodeCtrl.text = p.barcode ?? '';
    _skuCtrl.text = p.sku ?? '';
    _basePriceCtrl.text = (p.basePriceCents / 100).toStringAsFixed(0);
    _sellingPriceCtrl.text = (p.sellingPriceCents / 100).toStringAsFixed(0);
    _vatCtrl.text = p.vatRate.toString();
    _vatRate = p.vatRate;
    _isPacket = p.isPacket;
    _itemsPerPacketCtrl.text = p.itemsPerPacket.toString();
    if (p.unitSellingPriceCents != null) {
      _unitPriceCtrl.text = (p.unitSellingPriceCents! / 100).toStringAsFixed(0);
    }
    _selectedCategoryId = p.categoryId;
    _selectedSupplierId = p.supplierId;

    final labels = [p.field1Label, p.field2Label, p.field3Label, p.field4Label, p.field5Label,
                    p.field6Label, p.field7Label, p.field8Label, p.field9Label, p.field10Label];
    final values = [p.field1Value, p.field2Value, p.field3Value, p.field4Value, p.field5Value,
                    p.field6Value, p.field7Value, p.field8Value, p.field9Value, p.field10Value];
    for (int i = 0; i < 10; i++) {
      _fieldLabelCtrls[i].text = labels[i] ?? '';
      _fieldValueCtrls[i].text = values[i] ?? '';
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameCtrl.dispose(); _barcodeCtrl.dispose(); _skuCtrl.dispose();
    _basePriceCtrl.dispose(); _sellingPriceCtrl.dispose();
    _vatCtrl.dispose(); _stockCtrl.dispose(); _alertLimitCtrl.dispose();
    _shelfCtrl.dispose(); _itemsPerPacketCtrl.dispose(); _unitPriceCtrl.dispose();
    for (final c in [..._fieldLabelCtrls, ..._fieldValueCtrls]) c.dispose();
    super.dispose();
  }

  // ── Soumission ───────────────────────────────────
  void _submit() {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      _showError('Le nom du produit est obligatoire.');
      return;
    }

    final basePrice = int.tryParse(_basePriceCtrl.text.replaceAll(' ', '').replaceAll(',', ''));
    final sellingPrice = int.tryParse(_sellingPriceCtrl.text.replaceAll(' ', '').replaceAll(',', ''));
    if (basePrice == null || sellingPrice == null || basePrice < 0 || sellingPrice < 0) {
      _showError('Les prix doivent être des nombres valides.');
      return;
    }

    // Construire la map des champs personnalisés
    final Map<int, ({String label, String value})> customFields = {};
    for (int i = 0; i < 10; i++) {
      final label = _fieldLabelCtrls[i].text.trim();
      final value = _fieldValueCtrls[i].text.trim();
      if (label.isNotEmpty || value.isNotEmpty) {
        customFields[i + 1] = (label: label, value: value);
      }
    }

    if (_isEdit) {
      context.read<CatalogueBloc>().add(UpdateProductEvent(
        productId: widget.product!.id,
        shopId: widget.shopId,
        name: name,
        barcode: _barcodeCtrl.text.trim().isNotEmpty ? _barcodeCtrl.text.trim() : null,
        sku: _skuCtrl.text.trim().isNotEmpty ? _skuCtrl.text.trim() : null,
        basePriceCents: basePrice * 100,
        sellingPriceCents: sellingPrice * 100,
        vatRate: double.tryParse(_vatCtrl.text) ?? 19.25,
        isPacket: _isPacket,
        itemsPerPacket: int.tryParse(_itemsPerPacketCtrl.text) ?? 1,
        unitSellingPriceCents: _unitPriceCtrl.text.isNotEmpty ? (int.tryParse(_unitPriceCtrl.text) ?? 0) * 100 : null,
        categoryId: _selectedCategoryId,
        supplierId: _selectedSupplierId,
        alertLimit: int.tryParse(_alertLimitCtrl.text) ?? 5,
        shelfLocation: _shelfCtrl.text.trim().isNotEmpty ? _shelfCtrl.text.trim() : null,
        customFields: customFields,
      ));
    } else {
      context.read<CatalogueBloc>().add(CreateProductEvent(
        shopId: widget.shopId,
        name: name,
        barcode: _barcodeCtrl.text.trim().isNotEmpty ? _barcodeCtrl.text.trim() : null,
        sku: _skuCtrl.text.trim().isNotEmpty ? _skuCtrl.text.trim() : null,
        basePriceCents: basePrice * 100,
        sellingPriceCents: sellingPrice * 100,
        vatRate: double.tryParse(_vatCtrl.text) ?? 19.25,
        isPacket: _isPacket,
        itemsPerPacket: int.tryParse(_itemsPerPacketCtrl.text) ?? 1,
        unitSellingPriceCents: _unitPriceCtrl.text.isNotEmpty ? (int.tryParse(_unitPriceCtrl.text) ?? 0) * 100 : null,
        categoryId: _selectedCategoryId,
        supplierId: _selectedSupplierId,
        initialStock: int.tryParse(_stockCtrl.text) ?? 0,
        alertLimit: int.tryParse(_alertLimitCtrl.text) ?? 5,
        shelfLocation: _shelfCtrl.text.trim().isNotEmpty ? _shelfCtrl.text.trim() : null,
        customFields: customFields,
      ));
    }

    Navigator.pop(context);
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: const Color(0xFFDC2626),
    ));
  }

  // ── Build ─────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width >= 900;

    return BlocListener<CatalogueBloc, CatalogueState>(
      listener: (context, state) {
        if (state.errorMessage != null) {
          _showError(state.errorMessage!);
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(_isEdit ? 'Modifier le Produit' : 'Nouveau Produit',
              style: const TextStyle(fontWeight: FontWeight.bold)),
          actions: [
            BlocBuilder<CatalogueBloc, CatalogueState>(
              builder: (context, state) => state.isSaving
                  ? const Padding(
                      padding: EdgeInsets.all(16),
                      child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                    )
                  : TextButton.icon(
                      icon: const Icon(Icons.check),
                      label: Text(_isEdit ? 'Enregistrer' : 'Créer', style: const TextStyle(fontWeight: FontWeight.bold)),
                      onPressed: _submit,
                    ),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: isWide ? _buildWideLayout() : _buildNarrowLayout(),
      ),
    );
  }

  // ────────────────────────────────────────────────
  //  PC : Bento Grid 3 colonnes
  // ────────────────────────────────────────────────
  Widget _buildWideLayout() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // Ligne 1 : Photo | Infos principales | Prix & TVA
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ─ Bloc Photo ─────────────────────
                _BentoCard(
                  width: 200,
                  child: _PhotoBlock(),
                ),
                const SizedBox(width: 16),

                // ─ Bloc Infos principales ─────────
                Expanded(
                  flex: 3,
                  child: _BentoCard(
                    title: 'Identification',
                    icon: Icons.inventory_2,
                    child: _IdentificationBlock(
                      nameCtrl: _nameCtrl,
                      barcodeCtrl: _barcodeCtrl,
                      skuCtrl: _skuCtrl,
                    ),
                  ),
                ),
                const SizedBox(width: 16),

                // ─ Bloc Prix & TVA ────────────────
                Expanded(
                  flex: 2,
                  child: _BentoCard(
                    title: 'Prix & TVA',
                    icon: Icons.price_change,
                    child: _PriceBlock(
                      basePriceCtrl: _basePriceCtrl,
                      sellingPriceCtrl: _sellingPriceCtrl,
                      vatCtrl: _vatCtrl,
                      onVatChanged: (v) => setState(() => _vatRate = v),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Ligne 2 : Conditionnement | Stock | Emplacement
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ─ Conditionnement ────────────────
                Expanded(
                  flex: 2,
                  child: _BentoCard(
                    title: 'Conditionnement',
                    icon: Icons.inventory,
                    child: _PackagingBlock(
                      isPacket: _isPacket,
                      onPacketChanged: (v) => setState(() => _isPacket = v),
                      itemsPerPacketCtrl: _itemsPerPacketCtrl,
                      unitPriceCtrl: _unitPriceCtrl,
                    ),
                  ),
                ),
                const SizedBox(width: 16),

                // ─ Stock initial ──────────────────
                Expanded(
                  child: _BentoCard(
                    title: 'Stock',
                    icon: Icons.warehouse,
                    child: _StockBlock(
                      stockCtrl: _stockCtrl,
                      alertLimitCtrl: _alertLimitCtrl,
                      isEdit: _isEdit,
                    ),
                  ),
                ),
                const SizedBox(width: 16),

                // ─ Emplacement ────────────────────
                Expanded(
                  child: _BentoCard(
                    title: 'Rayon & Emplacement',
                    icon: Icons.shelves,
                    child: _ShelfBlock(shelfCtrl: _shelfCtrl),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Ligne 3 : 10 Attributs personnalisables (grille 2 colonnes)
          _BentoCard(
            title: '10 Attributs Personnalisables',
            icon: Icons.tune,
            child: _CustomFieldsGrid(
              labelCtrls: _fieldLabelCtrls,
              valueCtrls: _fieldValueCtrls,
            ),
          ),
        ],
      ),
    );
  }

  // ────────────────────────────────────────────────
  //  Mobile : Onglets
  // ────────────────────────────────────────────────
  Widget _buildNarrowLayout() {
    return Column(
      children: [
        TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.info_outline), text: 'Infos'),
            Tab(icon: Icon(Icons.price_change), text: 'Prix'),
            Tab(icon: Icon(Icons.tune), text: 'Attributs'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              // Onglet 1
              SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  _PhotoBlock(),
                  const SizedBox(height: 12),
                  _BentoCard(
                    title: 'Identification',
                    icon: Icons.inventory_2,
                    child: _IdentificationBlock(
                      nameCtrl: _nameCtrl,
                      barcodeCtrl: _barcodeCtrl,
                      skuCtrl: _skuCtrl,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _BentoCard(
                    title: 'Stock',
                    icon: Icons.warehouse,
                    child: _StockBlock(
                      stockCtrl: _stockCtrl,
                      alertLimitCtrl: _alertLimitCtrl,
                      isEdit: _isEdit,
                    ),
                  ),
                ]),
              ),
              // Onglet 2
              SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  _BentoCard(
                    title: 'Prix & TVA',
                    icon: Icons.price_change,
                    child: _PriceBlock(
                      basePriceCtrl: _basePriceCtrl,
                      sellingPriceCtrl: _sellingPriceCtrl,
                      vatCtrl: _vatCtrl,
                      onVatChanged: (v) => setState(() => _vatRate = v),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _BentoCard(
                    title: 'Conditionnement',
                    icon: Icons.inventory,
                    child: _PackagingBlock(
                      isPacket: _isPacket,
                      onPacketChanged: (v) => setState(() => _isPacket = v),
                      itemsPerPacketCtrl: _itemsPerPacketCtrl,
                      unitPriceCtrl: _unitPriceCtrl,
                    ),
                  ),
                ]),
              ),
              // Onglet 3
              SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: _BentoCard(
                  title: '10 Attributs Personnalisables',
                  icon: Icons.tune,
                  child: _CustomFieldsGrid(
                    labelCtrls: _fieldLabelCtrls,
                    valueCtrls: _fieldValueCtrls,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────
//  Widgets Bento réutilisables
// ─────────────────────────────────────────────────────

class _BentoCard extends StatelessWidget {
  final String? title;
  final IconData? icon;
  final Widget child;
  final double? width;

  const _BentoCard({this.title, this.icon, required this.child, this.width});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: width,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (title != null) ...[
              Row(
                children: [
                  if (icon != null) Icon(icon, size: 16, color: const Color(0xFF2563EB)),
                  if (icon != null) const SizedBox(width: 6),
                  Text(title!, style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF64748B),
                    letterSpacing: 0.5,
                  )),
                ],
              ),
              const SizedBox(height: 14),
            ],
            child,
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────
//  Bloc Photo
// ─────────────────────────────────────────────────────
class _PhotoBlock extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
          ),
          child: const Icon(Icons.image_outlined, size: 40, color: Color(0xFFCBD5E1)),
        ),
        const SizedBox(height: 10),
        FilledButton.tonal(
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            textStyle: const TextStyle(fontSize: 12),
          ),
          onPressed: () {}, // TODO: image picker
          child: const Text('Ajouter photo'),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────
//  Bloc Identification
// ─────────────────────────────────────────────────────
class _IdentificationBlock extends StatelessWidget {
  final TextEditingController nameCtrl;
  final TextEditingController barcodeCtrl;
  final TextEditingController skuCtrl;

  const _IdentificationBlock({
    required this.nameCtrl,
    required this.barcodeCtrl,
    required this.skuCtrl,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _Field(controller: nameCtrl, label: 'Nom du produit *', hint: 'ex: Farine de blé T55 25kg'),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _Field(
            controller: barcodeCtrl,
            label: 'Code-barres (EAN)',
            hint: '3700000000000',
            suffixIcon: Icons.qr_code_scanner,
            inputType: TextInputType.number,
          )),
          const SizedBox(width: 12),
          Expanded(child: _Field(
            controller: skuCtrl,
            label: 'SKU / Référence interne',
            hint: 'REF-001',
          )),
        ]),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────
//  Bloc Prix & TVA
// ─────────────────────────────────────────────────────
class _PriceBlock extends StatelessWidget {
  final TextEditingController basePriceCtrl;
  final TextEditingController sellingPriceCtrl;
  final TextEditingController vatCtrl;
  final ValueChanged<double> onVatChanged;

  const _PriceBlock({
    required this.basePriceCtrl,
    required this.sellingPriceCtrl,
    required this.vatCtrl,
    required this.onVatChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _Field(
          controller: basePriceCtrl,
          label: "Prix d'achat (base)",
          hint: '0',
          inputType: TextInputType.number,
          prefixText: 'FCFA ',
        ),
        const SizedBox(height: 12),
        _Field(
          controller: sellingPriceCtrl,
          label: 'Prix de vente *',
          hint: '0',
          inputType: TextInputType.number,
          prefixText: 'FCFA ',
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<double>(
          value: double.tryParse(vatCtrl.text) ?? 19.25,
          decoration: const InputDecoration(labelText: 'Taux TVA', border: OutlineInputBorder(), isDense: true),
          items: const [
            DropdownMenuItem(value: 0.0, child: Text('0% — Exonéré')),
            DropdownMenuItem(value: 5.0, child: Text('5%')),
            DropdownMenuItem(value: 10.0, child: Text('10%')),
            DropdownMenuItem(value: 19.25, child: Text('19,25% — Standard')),
            DropdownMenuItem(value: 20.0, child: Text('20%')),
          ],
          onChanged: (v) {
            if (v != null) {
              vatCtrl.text = v.toString();
              onVatChanged(v);
            }
          },
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────
//  Bloc Conditionnement
// ─────────────────────────────────────────────────────
class _PackagingBlock extends StatelessWidget {
  final bool isPacket;
  final ValueChanged<bool> onPacketChanged;
  final TextEditingController itemsPerPacketCtrl;
  final TextEditingController unitPriceCtrl;

  const _PackagingBlock({
    required this.isPacket,
    required this.onPacketChanged,
    required this.itemsPerPacketCtrl,
    required this.unitPriceCtrl,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SwitchListTile.adaptive(
          title: const Text('Vendu en carton/lot', style: TextStyle(fontSize: 14)),
          subtitle: const Text('Active la vente à l\'unité', style: TextStyle(fontSize: 12)),
          value: isPacket,
          onChanged: onPacketChanged,
          contentPadding: EdgeInsets.zero,
        ),
        if (isPacket) ...[
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _Field(
              controller: itemsPerPacketCtrl,
              label: 'Unités / carton',
              inputType: TextInputType.number,
            )),
            const SizedBox(width: 12),
            Expanded(child: _Field(
              controller: unitPriceCtrl,
              label: "Prix unitaire (FCFA)",
              inputType: TextInputType.number,
              prefixText: 'FCFA ',
            )),
          ]),
        ],
      ],
    );
  }
}

// ─────────────────────────────────────────────────────
//  Bloc Stock
// ─────────────────────────────────────────────────────
class _StockBlock extends StatelessWidget {
  final TextEditingController stockCtrl;
  final TextEditingController alertLimitCtrl;
  final bool isEdit;

  const _StockBlock({required this.stockCtrl, required this.alertLimitCtrl, required this.isEdit});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (!isEdit)
          _Field(
            controller: stockCtrl,
            label: 'Stock initial (boutique)',
            inputType: TextInputType.number,
            hint: '0',
          ),
        if (!isEdit) const SizedBox(height: 12),
        _Field(
          controller: alertLimitCtrl,
          label: "Seuil d'alerte stock",
          inputType: TextInputType.number,
          hint: '5',
          suffixIcon: Icons.notifications_none,
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────
//  Bloc Emplacement
// ─────────────────────────────────────────────────────
class _ShelfBlock extends StatelessWidget {
  final TextEditingController shelfCtrl;
  const _ShelfBlock({required this.shelfCtrl});

  @override
  Widget build(BuildContext context) {
    return _Field(
      controller: shelfCtrl,
      label: 'Emplacement en rayon',
      hint: 'ex: Rayon A - Étagère 3',
      suffixIcon: Icons.shelves,
    );
  }
}

// ─────────────────────────────────────────────────────
//  Grille des 10 attributs personnalisables
// ─────────────────────────────────────────────────────
class _CustomFieldsGrid extends StatelessWidget {
  final List<TextEditingController> labelCtrls;
  final List<TextEditingController> valueCtrls;

  const _CustomFieldsGrid({required this.labelCtrls, required this.valueCtrls});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(10, (i) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(children: [
          // Numéro de champ
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: const Color(0xFF2563EB).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Center(
              child: Text('${i + 1}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
            ),
          ),
          const SizedBox(width: 10),
          // Label personnalisable
          Expanded(
            flex: 2,
            child: TextField(
              controller: labelCtrls[i],
              decoration: InputDecoration(
                labelText: 'Étiquette',
                isDense: true,
                border: const OutlineInputBorder(),
                hintText: _defaultLabels[i],
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Valeur
          Expanded(
            flex: 3,
            child: TextField(
              controller: valueCtrls[i],
              decoration: const InputDecoration(
                labelText: 'Valeur',
                isDense: true,
                border: OutlineInputBorder(),
              ),
            ),
          ),
        ]),
      )).toList(),
    );
  }

  static const _defaultLabels = [
    'Marque', 'Modèle', 'Couleur', 'Taille/Dimension', 'Poids',
    "Date d'expiration", 'Garantie (mois)', 'Numéro de lot', 'Conditionnement', 'Note interne',
  ];
}

// ─────────────────────────────────────────────────────
//  Widget champ de texte standardisé
// ─────────────────────────────────────────────────────
class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String? hint;
  final String? prefixText;
  final IconData? suffixIcon;
  final TextInputType inputType;

  const _Field({
    required this.controller,
    required this.label,
    this.hint,
    this.prefixText,
    this.suffixIcon,
    this.inputType = TextInputType.text,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: inputType,
      inputFormatters: inputType == TextInputType.number
          ? [FilteringTextInputFormatter.allow(RegExp(r'[0-9,.]'))]
          : null,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixText: prefixText,
        suffixIcon: suffixIcon != null ? Icon(suffixIcon, size: 18) : null,
        isDense: true,
        border: const OutlineInputBorder(),
      ),
    );
  }
}
