import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/widgets/iventello_logo.dart';
import '../../../auth/domain/entities/shop_entity.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../auth/presentation/bloc/auth_event.dart';


// ─────────────────────────────────────────────
//  Entrées de navigation du sidebar
// ─────────────────────────────────────────────
enum _AdminSection {
  boutiques,
  employes,
  rapports,
  parametres,
}

extension _AdminSectionExt on _AdminSection {
  String get label => switch (this) {
        _AdminSection.boutiques => 'Boutiques',
        _AdminSection.employes => 'Employés',
        _AdminSection.rapports => 'Rapports',
        _AdminSection.parametres => 'Paramètres',
      };

  IconData get icon => switch (this) {
        _AdminSection.boutiques => Icons.storefront_outlined,
        _AdminSection.employes => Icons.people_outline,
        _AdminSection.rapports => Icons.bar_chart_outlined,
        _AdminSection.parametres => Icons.settings_outlined,
      };

  IconData get activeIcon => switch (this) {
        _AdminSection.boutiques => Icons.storefront,
        _AdminSection.employes => Icons.people,
        _AdminSection.rapports => Icons.bar_chart,
        _AdminSection.parametres => Icons.settings,
      };
}

// ─────────────────────────────────────────────
//  Écran principal
// ─────────────────────────────────────────────
class AdminDashboardScreen extends StatefulWidget {
  final VoidCallback onOpenShopPos;

  const AdminDashboardScreen({super.key, required this.onOpenShopPos});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  _AdminSection _currentSection = _AdminSection.boutiques;

  // ── Création boutique ────────────────────────
  void _showCreateShopDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final codeCtrl = TextEditingController();
    final cityCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final currencyCtrl = TextEditingController(text: 'FCFA');
    final vatCtrl = TextEditingController(text: '19.25');
    String type = 'BOUTIQUE_VENTE';

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.add_business, color: Color(0xFF2563EB)),
              SizedBox(width: 10),
              Text('Créer une Nouvelle Boutique'),
            ],
          ),
          content: SingleChildScrollView(
            child: SizedBox(
              width: 500,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _field(nameCtrl, 'Nom de la Boutique *'),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: _field(codeCtrl, 'Code (ex: BTQ-02) *')),
                    const SizedBox(width: 12),
                    Expanded(child: _field(cityCtrl, 'Ville *')),
                  ]),
                  const SizedBox(height: 12),
                  _field(addressCtrl, 'Adresse physique'),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: _field(phoneCtrl, 'Téléphone')),
                    const SizedBox(width: 12),
                    Expanded(child: _field(currencyCtrl, 'Devise (ex: FCFA, €)')),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: vatCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'TVA (%)'),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: type,
                    decoration: const InputDecoration(labelText: "Type d'établissement"),
                    items: const [
                      DropdownMenuItem(value: 'BOUTIQUE_VENTE', child: Text('Boutique / Point de Vente')),
                      DropdownMenuItem(value: 'ENTREPOT_CENTRAL', child: Text('Entrepôt Central / Dépôt')),
                      DropdownMenuItem(value: 'POINT_RELAIS', child: Text('Point Relais')),
                    ],
                    onChanged: (val) => setDialogState(() => type = val ?? 'BOUTIQUE_VENTE'),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogCtx), child: const Text('Annuler')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F172A)),
              onPressed: () {
                if (nameCtrl.text.trim().isEmpty || codeCtrl.text.trim().isEmpty || cityCtrl.text.trim().isEmpty) {
                  return;
                }
                context.read<AuthBloc>().add(CreateShopEvent(
                      name: nameCtrl.text.trim(),
                      code: codeCtrl.text.trim(),
                      city: cityCtrl.text.trim(),
                      address: addressCtrl.text.trim(),
                      phone: phoneCtrl.text.trim(),
                      currencySymbol: currencyCtrl.text.trim().isNotEmpty ? currencyCtrl.text.trim() : 'FCFA',
                      defaultVatRate: double.tryParse(vatCtrl.text) ?? 19.25,
                      type: type,
                    ));
                Navigator.pop(dialogCtx);
              },
              child: const Text('Créer la Boutique', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  TextField _field(TextEditingController ctrl, String label) =>
      TextField(controller: ctrl, decoration: InputDecoration(labelText: label));

  // ── Build principal ──────────────────────────
  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width >= 720;

    return isWide ? _buildWideLayout(context) : _buildNarrowLayout(context);
  }

  // ────────────────────────────────────────────
  //  PC : sidebar NavigationRail fixe à gauche
  // ────────────────────────────────────────────
  Widget _buildWideLayout(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final sidebarBg = isDark ? const Color(0xFF0F1115) : const Color(0xFF0F172A);
    final user = context.watch<AuthBloc>().state.currentUser;

    return Scaffold(
      body: Row(
        children: [
          // ── Sidebar ─────────────────────────
          Container(
            width: 240,
            color: sidebarBg,
            child: Column(
              children: [
                // Logo + titre
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
                  child: Row(
                    children: [
                      const IventelloLogo(size: 32),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Text(
                          'Iventello',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const Divider(color: Colors.white12, height: 1),
                const SizedBox(height: 12),

                // Navigation items
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    children: _AdminSection.values.map((s) => _SidebarItem(
                          section: s,
                          isSelected: _currentSection == s,
                          onTap: () => setState(() => _currentSection = s),
                        )).toList(),
                  ),
                ),

                const Divider(color: Colors.white12, height: 1),

                // Pied de sidebar : profil + actions
                Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    children: [
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFF2563EB),
                          radius: 18,
                          child: Text(
                            user?.firstName.isNotEmpty == true ? user!.firstName[0].toUpperCase() : 'A',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                        ),
                        title: Text(
                          user?.fullName ?? 'Admin',
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: const Text('Super Admin', style: TextStyle(color: Colors.white38, fontSize: 11)),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Expanded(
                            child: _SidebarAction(
                              icon: Icons.lock_clock,
                              tooltip: 'Verrouiller',
                              onTap: () => context.read<AuthBloc>().add(LockSessionEvent()),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _SidebarAction(
                              icon: Icons.logout,
                              tooltip: 'Déconnexion',
                              onTap: () => context.read<AuthBloc>().add(LogoutEvent()),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Contenu principal ────────────────
          Expanded(
            child: _buildSectionContent(context),
          ),
        ],
      ),
    );
  }

  // ────────────────────────────────────────────
  //  Mobile : AppBar + Drawer hamburger
  // ────────────────────────────────────────────
  Widget _buildNarrowLayout(BuildContext context) {
    final user = context.watch<AuthBloc>().state.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const IventelloLogo(size: 24),
            const SizedBox(width: 8),
            Text(_currentSection.label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
      drawer: Drawer(
        backgroundColor: const Color(0xFF0F172A),
        child: SafeArea(
          child: Column(
            children: [
              // En-tête drawer
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                child: Row(
                  children: [
                    const IventelloLogo(size: 28),
                    const SizedBox(width: 10),
                    const Text('Iventello', style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              const Divider(color: Colors.white12),

              // Navigation
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  children: _AdminSection.values.map((s) => _SidebarItem(
                        section: s,
                        isSelected: _currentSection == s,
                        onTap: () {
                          setState(() => _currentSection = s);
                          Navigator.pop(context);
                        },
                      )).toList(),
                ),
              ),

              const Divider(color: Colors.white12),
              // Profil
              ListTile(
                leading: CircleAvatar(
                  backgroundColor: const Color(0xFF2563EB),
                  radius: 16,
                  child: Text(
                    user?.firstName.isNotEmpty == true ? user!.firstName[0].toUpperCase() : 'A',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
                title: Text(user?.fullName ?? 'Admin', style: const TextStyle(color: Colors.white, fontSize: 13)),
                subtitle: const Text('Super Admin', style: TextStyle(color: Colors.white38, fontSize: 11)),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.lock_clock, color: Colors.white54),
                      onPressed: () => context.read<AuthBloc>().add(LockSessionEvent()),
                    ),
                    IconButton(
                      icon: const Icon(Icons.logout, color: Colors.white54),
                      onPressed: () => context.read<AuthBloc>().add(LogoutEvent()),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
      body: _buildSectionContent(context),
    );
  }

  // ────────────────────────────────────────────
  //  Contenu selon section active
  // ────────────────────────────────────────────
  Widget _buildSectionContent(BuildContext context) {
    return switch (_currentSection) {
      _AdminSection.boutiques => _BoutiquesSection(onOpenShopPos: widget.onOpenShopPos, onCreateShop: () => _showCreateShopDialog(context)),
      _AdminSection.employes => const _ComingSoonSection(label: 'Employés', icon: Icons.people),
      _AdminSection.rapports => const _ComingSoonSection(label: 'Rapports & Statistiques', icon: Icons.bar_chart),
      _AdminSection.parametres => const _ComingSoonSection(label: 'Paramètres Système', icon: Icons.settings),
    };
  }
}

// ─────────────────────────────────────────────
//  Widget : item de navigation sidebar
// ─────────────────────────────────────────────
class _SidebarItem extends StatelessWidget {
  final _AdminSection section;
  final bool isSelected;
  final VoidCallback onTap;

  const _SidebarItem({required this.section, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xFF2563EB).withValues(alpha: 0.18) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
        leading: Icon(
          isSelected ? section.activeIcon : section.icon,
          color: isSelected ? const Color(0xFF60A5FA) : Colors.white38,
          size: 22,
        ),
        title: Text(
          section.label,
          style: TextStyle(
            color: isSelected ? const Color(0xFF60A5FA) : Colors.white60,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            fontSize: 14,
          ),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        onTap: onTap,
        selected: isSelected,
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  Widget : bouton action sidebar
// ─────────────────────────────────────────────
class _SidebarAction extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  const _SidebarAction({required this.icon, required this.tooltip, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: Colors.white38, size: 20),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  Section : Boutiques
// ─────────────────────────────────────────────
class _BoutiquesSection extends StatelessWidget {
  final VoidCallback onOpenShopPos;
  final VoidCallback onCreateShop;

  const _BoutiquesSection({required this.onOpenShopPos, required this.onCreateShop});

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    final shops = authState.availableShops;

    return Column(
      children: [
        // En-tête de section
        Padding(
          padding: const EdgeInsets.fromLTRB(28, 28, 28, 0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Boutiques & Points de Vente',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '${shops.length} boutique(s) dans votre réseau',
                    style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                  ),
                ],
              ),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                ),
                icon: const Icon(Icons.add_business, size: 18),
                label: const Text('Nouvelle Boutique', style: TextStyle(fontWeight: FontWeight.bold)),
                onPressed: onCreateShop,
              ),
            ],
          ),
        ),

        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 28),
          child: Divider(height: 32),
        ),

        // Grille boutiques
        Expanded(
          child: shops.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.storefront_outlined, size: 64, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      const Text('Aucune boutique configurée.', style: TextStyle(fontSize: 16, color: Color(0xFF94A3B8))),
                      const SizedBox(height: 8),
                      const Text('Créez votre première boutique pour commencer.', style: TextStyle(fontSize: 13, color: Color(0xFFCBD5E1))),
                      const SizedBox(height: 24),
                      FilledButton.icon(
                        style: FilledButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
                        icon: const Icon(Icons.add_business),
                        label: const Text('Créer une boutique'),
                        onPressed: onCreateShop,
                      ),
                    ],
                  ),
                )
              : Padding(
                  padding: const EdgeInsets.fromLTRB(28, 0, 28, 28),
                  child: GridView.builder(
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 400,
                      mainAxisExtent: 200,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                    ),
                    itemCount: shops.length,
                    itemBuilder: (context, i) => _ShopCard(
                      shop: shops[i],
                      isSelected: authState.activeShop?.id == shops[i].id,
                      onOpen: () {
                        context.read<AuthBloc>().add(SelectActiveShopEvent(shops[i]));
                        onOpenShopPos();
                      },
                    ),
                  ),
                ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────
//  Widget : carte boutique
// ─────────────────────────────────────────────
class _ShopCard extends StatelessWidget {
  final ShopEntity shop;
  final bool isSelected;
  final VoidCallback onOpen;

  const _ShopCard({required this.shop, required this.isSelected, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    final isEntrepot = shop.type == 'ENTREPOT_CENTRAL';
    final accentColor = isEntrepot ? const Color(0xFFD97706) : const Color(0xFF2563EB);
    final bgColor = isEntrepot ? const Color(0xFFFFFBEB) : const Color(0xFFEFF6FF);

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: isSelected ? accentColor : const Color(0xFFE2E8F0),
          width: isSelected ? 2 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(10)),
                  child: Icon(isEntrepot ? Icons.warehouse : Icons.storefront, color: accentColor, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(shop.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15), overflow: TextOverflow.ellipsis),
                      Text('${shop.code} • ${shop.city ?? ""}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: shop.isActive ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    shop.isActive ? 'Actif' : 'Inactif',
                    style: TextStyle(
                      color: shop.isActive ? const Color(0xFF059669) : const Color(0xFFDC2626),
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  isEntrepot ? 'Dépôt / Entrepôt' : 'Point de Vente',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF0F172A),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  icon: const Icon(Icons.point_of_sale, size: 15),
                  label: const Text('Ouvrir'),
                  onPressed: onOpen,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  Sections à venir
// ─────────────────────────────────────────────
class _ComingSoonSection extends StatelessWidget {
  final String label;
  final IconData icon;

  const _ComingSoonSection({required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(label, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
          const SizedBox(height: 8),
          const Text('Cette section sera disponible prochainement.', style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8))),
        ],
      ),
    );
  }
}
