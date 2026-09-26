import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/product_entity.dart';
import '../bloc/catalogue_bloc.dart';
import '../bloc/catalogue_bloc_events_states.dart';
import 'product_form_screen.dart';

/// Vue principale du catalogue produits avec liste + recherche FTS5
class CatalogueScreen extends StatefulWidget {
  final String shopId;
  final String shopName;

  const CatalogueScreen({super.key, required this.shopId, required this.shopName});

  @override
  State<CatalogueScreen> createState() => _CatalogueScreenState();
}

class _CatalogueScreenState extends State<CatalogueScreen> {
  final _searchCtrl = TextEditingController();
  String? _selectedCategoryId;

  @override
  void initState() {
    super.initState();
    context.read<CatalogueBloc>().add(LoadProductsEvent(widget.shopId));
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _openProductForm({ProductEntity? product}) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BlocProvider.value(
          value: context.read<CatalogueBloc>(),
          child: ProductFormScreen(shopId: widget.shopId, product: product),
        ),
      ),
    );
  }

  void _confirmDelete(ProductEntity product) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer ce produit ?'),
        content: Text('« ${product.name} » sera archivé et ne sera plus visible dans le catalogue.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
            onPressed: () {
              context.read<CatalogueBloc>().add(DeleteProductEvent(product.id));
              Navigator.pop(ctx);
            },
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocConsumer<CatalogueBloc, CatalogueState>(
        listener: (context, state) {
          if (state.successMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(state.successMessage!),
              backgroundColor: const Color(0xFF059669),
            ));
          }
          if (state.errorMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text(state.errorMessage!),
              backgroundColor: const Color(0xFFDC2626),
            ));
          }
        },
        builder: (context, state) {
          return Column(
            children: [
              // ── Barre supérieure ─────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                child: Row(
                  children: [
                    // Titre
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Catalogue Produits', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                          Text('${state.totalProducts} référence(s) • ${widget.shopName}',
                              style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                        ],
                      ),
                    ),
                    FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Nouveau Produit', style: TextStyle(fontWeight: FontWeight.bold)),
                      onPressed: () => _openProductForm(),
                    ),
                  ],
                ),
              ),

              // ── Barre de recherche ────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchCtrl,
                        decoration: InputDecoration(
                          hintText: 'Rechercher par nom, code-barres, SKU, attribut...',
                          prefixIcon: const Icon(Icons.search),
                          suffixIcon: _searchCtrl.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear),
                                  onPressed: () {
                                    _searchCtrl.clear();
                                    context.read<CatalogueBloc>().add(
                                          SearchProductsEvent(shopId: widget.shopId, query: ''),
                                        );
                                  },
                                )
                              : null,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          isDense: true,
                        ),
                        onChanged: (q) => context.read<CatalogueBloc>().add(
                              SearchProductsEvent(shopId: widget.shopId, query: q),
                            ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Filtre catégorie
                    if (state.categories.isNotEmpty)
                      DropdownButton<String?>(
                        value: _selectedCategoryId,
                        hint: const Text('Catégorie'),
                        underline: const SizedBox(),
                        items: [
                          const DropdownMenuItem(value: null, child: Text('Toutes')),
                          ...state.categories.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))),
                        ],
                        onChanged: (v) {
                          setState(() => _selectedCategoryId = v);
                          context.read<CatalogueBloc>().add(FilterByCategoryEvent(v));
                        },
                      ),
                  ],
                ),
              ),

              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Divider(height: 24),
              ),

              // ── Liste des produits ────────────────────────
              Expanded(
                child: state.isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : state.products.isEmpty
                        ? _EmptyState(onAdd: () => _openProductForm())
                        : _buildProductGrid(context, state.products),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildProductGrid(BuildContext context, List<ProductEntity> products) {
    final isWide = MediaQuery.of(context).size.width >= 720;

    if (isWide) {
      return GridView.builder(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: 340,
          mainAxisExtent: 170,
          crossAxisSpacing: 14,
          mainAxisSpacing: 14,
        ),
        itemCount: products.length,
        itemBuilder: (ctx, i) => _ProductCard(
          product: products[i],
          onTap: () => _openProductForm(product: products[i]),
          onDelete: () => _confirmDelete(products[i]),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      itemCount: products.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, i) => _ProductListTile(
        product: products[i],
        onTap: () => _openProductForm(product: products[i]),
        onDelete: () => _confirmDelete(products[i]),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────
//  Carte Produit (Grid — Desktop)
// ─────────────────────────────────────────────────────
class _ProductCard extends StatelessWidget {
  final ProductEntity product;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _ProductCard({required this.product, required this.onTap, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Image ou placeholder
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: product.imageUrl != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(product.imageUrl!, fit: BoxFit.cover),
                          )
                        : const Icon(Icons.inventory_2, color: Color(0xFF94A3B8), size: 22),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(product.name,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                        if (product.barcode != null)
                          Text(product.barcode!, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                      ],
                    ),
                  ),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert, size: 18),
                    onSelected: (v) => v == 'delete' ? onDelete() : onTap(),
                    itemBuilder: (_) => [
                      const PopupMenuItem(value: 'edit', child: Row(children: [Icon(Icons.edit, size: 16), SizedBox(width: 8), Text('Modifier')])),
                      const PopupMenuItem(value: 'delete', child: Row(children: [Icon(Icons.delete_outline, size: 16, color: Color(0xFFDC2626)), SizedBox(width: 8), Text('Supprimer', style: TextStyle(color: Color(0xFFDC2626)))])),
                    ],
                  ),
                ],
              ),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${product.sellingPrice.toStringAsFixed(0)} FCFA',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF2563EB))),
                      Text('Base: ${product.basePrice.toStringAsFixed(0)} FCFA',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                    ],
                  ),
                  _MarginBadge(margin: product.marginPercent),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────
//  ListTile Produit (Mobile)
// ─────────────────────────────────────────────────────
class _ProductListTile extends StatelessWidget {
  final ProductEntity product;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _ProductListTile({required this.product, required this.onTap, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        leading: Container(
          width: 42, height: 42,
          decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
          child: const Icon(Icons.inventory_2, color: Color(0xFF94A3B8), size: 20),
        ),
        title: Text(product.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text(
          product.barcode ?? product.sku ?? 'Pas de code-barres',
          style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text('${product.sellingPrice.toStringAsFixed(0)} FCFA',
                style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
            _MarginBadge(margin: product.marginPercent),
          ],
        ),
        onTap: onTap,
        onLongPress: onDelete,
      ),
    );
  }
}

// ─────────────────────────────────────────────────────
//  Badge Marge
// ─────────────────────────────────────────────────────
class _MarginBadge extends StatelessWidget {
  final double margin;
  const _MarginBadge({required this.margin});

  @override
  Widget build(BuildContext context) {
    final color = margin >= 30
        ? const Color(0xFF059669)
        : margin >= 10
            ? const Color(0xFFD97706)
            : const Color(0xFFDC2626);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        '+${margin.toStringAsFixed(0)}%',
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────
//  État vide
// ─────────────────────────────────────────────────────
class _EmptyState extends StatelessWidget {
  final VoidCallback onAdd;
  const _EmptyState({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.inventory_2_outlined, size: 72, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          const Text('Aucun produit dans le catalogue.', style: TextStyle(fontSize: 16, color: Color(0xFF94A3B8))),
          const SizedBox(height: 8),
          const Text('Commencez par ajouter votre première référence.', style: TextStyle(fontSize: 13, color: Color(0xFFCBD5E1))),
          const SizedBox(height: 24),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
            icon: const Icon(Icons.add),
            label: const Text('Ajouter un produit'),
            onPressed: onAdd,
          ),
        ],
      ),
    );
  }
}
