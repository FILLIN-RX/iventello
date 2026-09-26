import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'src/core/database/app_database.dart';
import 'src/core/theme/app_theme.dart';
import 'src/core/theme/theme_controller.dart';
import 'src/features/auth/domain/repositories/auth_repository.dart';
import 'src/features/auth/data/repositories/auth_repository_impl.dart';
import 'src/features/auth/presentation/bloc/auth_bloc.dart';
import 'src/features/auth/presentation/bloc/auth_event.dart';
import 'src/features/auth/presentation/bloc/auth_state.dart';
import 'src/features/auth/presentation/views/splash_screen.dart';
import 'src/features/auth/presentation/views/login_screen.dart';
import 'src/features/auth/presentation/views/forgot_password_screen.dart';
import 'src/features/auth/presentation/views/pin_lock_screen.dart';
import 'src/features/auth/presentation/views/onboarding_setup_screen.dart';
import 'src/features/admin/presentation/views/admin_dashboard_screen.dart';
import 'src/features/catalogue/data/repositories/catalogue_repository_impl.dart';
import 'src/features/catalogue/presentation/bloc/catalogue_bloc.dart';
import 'src/features/catalogue/presentation/bloc/catalogue_bloc_events_states.dart';
import 'src/features/catalogue/presentation/views/catalogue_screen.dart';
import 'src/core/widgets/iventello_logo.dart';
import 'src/rust/frb_generated.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Initialisation du pont natif Rust via flutter_rust_bridge v2
  await RustLib.init();

  // 2. Initialisation du moteur Drift SQLite FFI (mode WAL)
  final database = AppDatabase();

  final authRepository = AuthRepositoryImpl(db: database);

  runApp(
    IventelloApp(
      database: database,
      authRepository: authRepository,
    ),
  );
}

class IventelloApp extends StatelessWidget {
  final AppDatabase database;
  final AuthRepository authRepository;

  const IventelloApp({
    super.key,
    required this.database,
    required this.authRepository,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeController.themeModeNotifier,
      builder: (context, currentThemeMode, _) {
        return MultiRepositoryProvider(
          providers: [
            RepositoryProvider<AppDatabase>.value(value: database),
            RepositoryProvider<AuthRepository>.value(value: authRepository),
          ],
          child: MultiBlocProvider(
            providers: [
              BlocProvider<AuthBloc>(
                create: (context) => AuthBloc(authRepository: authRepository)..add(CheckAuthSessionEvent()),
              ),
            ],
            child: MaterialApp(
              title: 'Iventello 2.0 POS',
              debugShowCheckedModeBanner: false,
              theme: AppTheme.industrialLightTheme,
              darkTheme: AppTheme.industrialDarkTheme,
              themeMode: currentThemeMode,
              home: const AuthGatekeeper(),
            ),
          ),
        );
      },
    );
  }
}

enum UnauthView { login, forgotPassword, quickPin, onboarding }

/// Routeur principal réactif
class AuthGatekeeper extends StatefulWidget {
  const AuthGatekeeper({super.key});

  @override
  State<AuthGatekeeper> createState() => _AuthGatekeeperState();
}

class _AuthGatekeeperState extends State<AuthGatekeeper> {
  bool _splashDone = false;
  bool _showingAdminHub = true;
  UnauthView _unauthView = UnauthView.login;

  @override
  Widget build(BuildContext context) {
    // 1. Écran de démarrage SplashScreen natif au lancement
    if (!_splashDone) {
      return SplashScreen(
        onInitialized: () => setState(() => _splashDone = true),
      );
    }

    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if ((state.status == AuthStatus.initial || state.status == AuthStatus.loading) && state.currentUser == null) {
          return const Scaffold(
            backgroundColor: Color(0xFF0F1115),
            body: Center(child: CircularProgressIndicator(color: Color(0xFF0066FF))),
          );
        }

        // 2. Premier lancement ou mode Onboarding (création de compte)
        if (state.status == AuthStatus.needsOnboarding || _unauthView == UnauthView.onboarding) {
          return OnboardingSetupScreen(
            onSwitchToLogin: () => setState(() => _unauthView = UnauthView.login),
          );
        }

        // 3. Admin vient de s'enregistrer → auto-login → setup boutique
        if (state.status == AuthStatus.needsSetup && state.currentUser != null) {
          return AdminDashboardScreen(
            onOpenShopPos: () => setState(() => _showingAdminHub = false),
          );
        }

        // 4. Session verrouillée (Code PIN de caisse)
        if (state.isLocked) {
          return PinLockScreen(
            onSwitchToLogin: () => context.read<AuthBloc>().add(LogoutEvent()),
          );
        }

        // 5. Utilisateur connecté
        if (state.isAuthenticated) {
          final user = state.currentUser!;

          // Si c'est un SuperAdmin et qu'il est sur le Hub Master
          if (user.isSuperAdmin && _showingAdminHub) {
            return AdminDashboardScreen(
              onOpenShopPos: () => setState(() => _showingAdminHub = false),
            );
          }

          // Écran opérationnel de la Boutique choisie (POS & Stock)
          return IventelloHomeScreen(
            onBackToAdminHub: user.isSuperAdmin ? () => setState(() => _showingAdminHub = true) : null,
          );
        }

        // 6. Vues Non-Authentifiées (Mot de passe oublié, PIN rapide, Connexion standard)
        if (_unauthView == UnauthView.forgotPassword) {
          return ForgotPasswordScreen(
            onBackToLogin: () => setState(() => _unauthView = UnauthView.login),
          );
        }

        if (_unauthView == UnauthView.quickPin) {
          return PinLockScreen(
            onSwitchToLogin: () => setState(() => _unauthView = UnauthView.login),
          );
        }

        return LoginScreen(
          onForgotPassword: () => setState(() => _unauthView = UnauthView.forgotPassword),
          onQuickPin: () => setState(() => _unauthView = UnauthView.quickPin),
          onGoToSetup: () => setState(() => _unauthView = UnauthView.onboarding),
        );
      },
    );
  }
}


// ─────────────────────────────────────────────────────────────────────────────
//  Shell de Boutique — chaque boutique est totalement isolée
//  Catalogue, caisse, stock → tous scopés au shopId actif
// ─────────────────────────────────────────────────────────────────────────────
class IventelloHomeScreen extends StatefulWidget {
  final VoidCallback? onBackToAdminHub;
  const IventelloHomeScreen({super.key, this.onBackToAdminHub});
  @override
  State<IventelloHomeScreen> createState() => _IventelloHomeScreenState();
}

enum _ShopSection { catalogue, caisse, stock, rapports }

extension _ShopSectionExt on _ShopSection {
  String get label => switch (this) {
        _ShopSection.catalogue => 'Catalogue',
        _ShopSection.caisse => 'Caisse (POS)',
        _ShopSection.stock => 'Stock & Inventaire',
        _ShopSection.rapports => 'Rapports',
      };
  IconData get icon => switch (this) {
        _ShopSection.catalogue => Icons.inventory_2_outlined,
        _ShopSection.caisse => Icons.point_of_sale_outlined,
        _ShopSection.stock => Icons.warehouse_outlined,
        _ShopSection.rapports => Icons.bar_chart_outlined,
      };
  IconData get activeIcon => switch (this) {
        _ShopSection.catalogue => Icons.inventory_2,
        _ShopSection.caisse => Icons.point_of_sale,
        _ShopSection.stock => Icons.warehouse,
        _ShopSection.rapports => Icons.bar_chart,
      };
}

class _IventelloHomeScreenState extends State<IventelloHomeScreen> {
  _ShopSection _section = _ShopSection.catalogue;

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    final user = authState.currentUser;
    final shop = authState.activeShop;
    if (shop == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final isWide = MediaQuery.of(context).size.width >= 720;

    return BlocProvider<CatalogueBloc>(
      key: ValueKey('catalogue_${shop.id}'),
      create: (ctx) => CatalogueBloc(
        repository: CatalogueRepositoryImpl(db: ctx.read<AppDatabase>()),
      )..add(LoadProductsEvent(shop.id)),
      child: isWide
          ? _buildWideShell(context, user, shop)
          : _buildNarrowShell(context, user, shop),
    );
  }

  Widget _buildWideShell(BuildContext context, dynamic user, dynamic shop) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF0F1115) : const Color(0xFF0F172A);
    return Scaffold(
      body: Row(
        children: [
          Container(
            width: 220, color: bg,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const IventelloLogo(size: 26),
                      const SizedBox(height: 10),
                      Text(shop.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14), overflow: TextOverflow.ellipsis),
                      Text('${shop.code} • ${shop.city ?? ""}', style: const TextStyle(color: Colors.white38, fontSize: 11)),
                    ],
                  ),
                ),
                const Divider(color: Colors.white12, height: 1),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    children: _ShopSection.values.map((s) => _ShopNavItem(
                      section: s, isSelected: _section == s,
                      onTap: () => setState(() => _section = s),
                    )).toList(),
                  ),
                ),
                const Divider(color: Colors.white12, height: 1),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      if (widget.onBackToAdminHub != null) ...[  
                        _SidebarShopBtn(
                          icon: Icons.grid_view,
                          label: 'Hub Multi-Boutiques',
                          onTap: widget.onBackToAdminHub!,
                        ),
                        const SizedBox(height: 8),
                      ],
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 13, backgroundColor: const Color(0xFF2563EB),
                            child: Text(
                              user?.firstName.isNotEmpty == true ? user!.firstName[0].toUpperCase() : 'U',
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: Text(user?.fullName ?? '', style: const TextStyle(color: Colors.white70, fontSize: 12), overflow: TextOverflow.ellipsis)),
                          IconButton(icon: const Icon(Icons.lock_clock, color: Colors.white38, size: 17), onPressed: () => context.read<AuthBloc>().add(LockSessionEvent()), padding: EdgeInsets.zero, constraints: const BoxConstraints()),
                          const SizedBox(width: 4),
                          IconButton(icon: const Icon(Icons.logout, color: Colors.white38, size: 17), onPressed: () => context.read<AuthBloc>().add(LogoutEvent()), padding: EdgeInsets.zero, constraints: const BoxConstraints()),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(child: _buildSectionContent(shop.id, shop.name)),
        ],
      ),
    );
  }

  Widget _buildNarrowShell(BuildContext context, dynamic user, dynamic shop) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const IventelloLogo(size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(shop.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                  Text(_section.label, style: const TextStyle(fontSize: 10, color: Colors.white70)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(icon: const Icon(Icons.lock_clock), onPressed: () => context.read<AuthBloc>().add(LockSessionEvent())),
          IconButton(icon: const Icon(Icons.logout), onPressed: () => context.read<AuthBloc>().add(LogoutEvent())),
        ],
      ),
      drawer: Drawer(
        backgroundColor: const Color(0xFF0F172A),
        child: SafeArea(child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const IventelloLogo(size: 24),
                const SizedBox(height: 8),
                Text(shop.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                Text('${shop.code} • ${shop.city ?? ""}', style: const TextStyle(color: Colors.white38, fontSize: 11)),
              ]),
            ),
            const Divider(color: Colors.white12),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                children: _ShopSection.values.map((s) => _ShopNavItem(
                  section: s, isSelected: _section == s,
                  onTap: () { setState(() => _section = s); Navigator.pop(context); },
                )).toList(),
              ),
            ),
            const Divider(color: Colors.white12),
            if (widget.onBackToAdminHub != null)
              ListTile(
                leading: const Icon(Icons.grid_view, color: Colors.white54, size: 18),
                title: const Text('Hub Multi-Boutiques', style: TextStyle(color: Colors.white70, fontSize: 13)),
                onTap: () { Navigator.pop(context); widget.onBackToAdminHub!(); },
              ),
            ListTile(
              leading: CircleAvatar(radius: 13, backgroundColor: const Color(0xFF2563EB),
                child: Text(user?.firstName.isNotEmpty == true ? user!.firstName[0].toUpperCase() : 'U', style: const TextStyle(color: Colors.white, fontSize: 11))),
              title: Text(user?.fullName ?? '', style: const TextStyle(color: Colors.white, fontSize: 12)),
              trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                IconButton(icon: const Icon(Icons.lock_clock, color: Colors.white38), onPressed: () => context.read<AuthBloc>().add(LockSessionEvent())),
                IconButton(icon: const Icon(Icons.logout, color: Colors.white38), onPressed: () => context.read<AuthBloc>().add(LogoutEvent())),
              ]),
            ),
            const SizedBox(height: 8),
          ],
        )),
      ),
      body: _buildSectionContent(shop.id, shop.name),
    );
  }

  // Tout est scopé au shopId — chaque boutique est indépendante
  Widget _buildSectionContent(String shopId, String shopName) {
    return switch (_section) {
      _ShopSection.catalogue => CatalogueScreen(shopId: shopId, shopName: shopName),
      _ShopSection.caisse    => const _ComingSoonShopSection(label: 'Caisse (POS)', icon: Icons.point_of_sale),
      _ShopSection.stock     => const _ComingSoonShopSection(label: 'Stock & Inventaire', icon: Icons.warehouse),
      _ShopSection.rapports  => const _ComingSoonShopSection(label: 'Rapports', icon: Icons.bar_chart),
    };
  }
}

class _ShopNavItem extends StatelessWidget {
  final _ShopSection section;
  final bool isSelected;
  final VoidCallback onTap;
  const _ShopNavItem({required this.section, required this.isSelected, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      margin: const EdgeInsets.only(bottom: 3),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xFF2563EB).withValues(alpha: 0.18) : Colors.transparent,
        borderRadius: BorderRadius.circular(9),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        leading: Icon(isSelected ? section.activeIcon : section.icon,
            color: isSelected ? const Color(0xFF60A5FA) : Colors.white38, size: 20),
        title: Text(section.label, style: TextStyle(
          color: isSelected ? const Color(0xFF60A5FA) : Colors.white54,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal, fontSize: 13,
        )),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
        onTap: onTap,
      ),
    );
  }
}

class _SidebarShopBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _SidebarShopBtn({required this.icon, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) => InkWell(
    borderRadius: BorderRadius.circular(8),
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(8)),
      child: Row(children: [
        Icon(icon, color: Colors.white54, size: 16),
        const SizedBox(width: 8),
        Expanded(child: Text(label, style: const TextStyle(color: Colors.white54, fontSize: 12))),
      ]),
    ),
  );
}

class _ComingSoonShopSection extends StatelessWidget {
  final String label;
  final IconData icon;
  const _ComingSoonShopSection({required this.label, required this.icon});
  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 64, color: Colors.grey.shade300),
        const SizedBox(height: 16),
        Text(label, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
        const SizedBox(height: 8),
        const Text('Disponible dans le prochain sprint.', style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8))),
      ],
    ),
  );
}

