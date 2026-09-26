import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/widgets/iventello_logo.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';

class OnboardingSetupScreen extends StatefulWidget {
  final VoidCallback? onSwitchToLogin;

  const OnboardingSetupScreen({
    super.key,
    this.onSwitchToLogin,
  });

  @override
  State<OnboardingSetupScreen> createState() => _OnboardingSetupScreenState();
}

class _OnboardingSetupScreenState extends State<OnboardingSetupScreen> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _pinController = TextEditingController();
  bool _obscurePassword = true;
  bool _agreeTerms = true;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  void _submitRegister() {
    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final pin = _pinController.text.trim();

    if (firstName.isEmpty || lastName.isEmpty || email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez renseigner tous les champs obligatoires.'),
          backgroundColor: Color(0xFFB91C1C),
        ),
      );
      return;
    }

    if (!_agreeTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez accepter les conditions d\'utilisation.'),
          backgroundColor: Color(0xFFB91C1C),
        ),
      );
      return;
    }

    context.read<AuthBloc>().add(
          RegisterSuperAdminEvent(
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
            pin: pin.isNotEmpty ? pin : null,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1115) : const Color(0xFFE5E7EB),
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state.errorMessage != null && state.errorMessage!.isNotEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage!),
                backgroundColor: const Color(0xFFB91C1C),
              ),
            );
          }
        },
        builder: (context, state) {
          return LayoutBuilder(
            builder: (context, constraints) {
              final isDesktop = constraints.maxWidth >= 840;

              if (isDesktop) {
                return _buildDesktopSplitLayout(context, state, isDark);
              } else {
                return _buildMobileFullLayout(context, state, isDark);
              }
            },
          );
        },
      ),
    );
  }

  /// Disposition Desktop : Formulaire à GAUCHE et Illustration pleine à DROITE
  Widget _buildDesktopSplitLayout(BuildContext context, AuthState state, bool isDark) {
    return Row(
      children: [
        // Panneau Gauche : Formulaire de Création de Compte
        Expanded(
          flex: 5,
          child: Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF16191F) : Colors.white,
              borderRadius: const BorderRadius.only(
                topRight: Radius.circular(28),
                bottomRight: Radius.circular(28),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.05),
                  blurRadius: 20,
                  offset: const Offset(4, 0),
                ),
              ],
            ),
            child: SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 56, vertical: 36),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 460),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Logo Officiel Iventello
                        const Center(
                          child: IventelloLogo(size: 52),
                        ),
                        const SizedBox(height: 20),

                        // Titre & Sous-titre
                        Center(
                          child: Text(
                            'Create an account',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827),
                              letterSpacing: -0.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Center(
                          child: Text(
                            'Start managing your POS and inventory',
                            style: TextStyle(
                              fontSize: 14,
                              color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                            ),
                          ),
                        ),
                        const SizedBox(height: 28),

                        // Formulaire d'inscription
                        _buildFormFields(isDark),
                        const SizedBox(height: 14),

                        // Case à cocher Conditions
                        Row(
                          children: [
                            SizedBox(
                              width: 20,
                              height: 20,
                              child: Checkbox(
                                value: _agreeTerms,
                                activeColor: isDark ? const Color(0xFF0066FF) : const Color(0xFF111827),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                onChanged: (val) => setState(() => _agreeTerms = val ?? true),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'I agree to the Terms of Service and Privacy Policy',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF4B5563),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // Bouton Créer Compte
                        _buildSubmitButton(state, isDark),

                        const SizedBox(height: 28),

                        // Lien vers Connexion
                        Center(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Already have an account? ',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                                ),
                              ),
                              InkWell(
                                onTap: widget.onSwitchToLogin,
                                child: Text(
                                  'Log In',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),

        // Panneau Droit : Illustration pleine hauteur (Full-Bleed)
        Expanded(
          flex: 6,
          child: SizedBox(
            width: double.infinity,
            height: double.infinity,
            child: Image.asset(
              'assets/onboarding/Stock Management - Product Scanning.png',
              width: double.infinity,
              height: double.infinity,
              fit: BoxFit.cover,
              alignment: Alignment.center,
              errorBuilder: (_, __, ___) => _buildFallbackIllustration(isDark),
            ),
          ),
        ),
      ],
    );
  }

  /// Disposition Mobile : Plein écran sans carte flottante
  Widget _buildMobileFullLayout(BuildContext context, AuthState state, bool isDark) {
    return SafeArea(
      child: Container(
        color: isDark ? const Color(0xFF0F1115) : Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 16),

            const Center(
              child: IventelloLogo(size: 48),
            ),
            const SizedBox(height: 16),

            Center(
              child: Text(
                'Create an account',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827),
                ),
              ),
            ),
            const SizedBox(height: 4),
            Center(
              child: Text(
                'Start managing your POS and inventory',
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                ),
              ),
            ),
            const SizedBox(height: 24),

            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildFormFields(isDark),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: Checkbox(
                            value: _agreeTerms,
                            activeColor: isDark ? const Color(0xFF0066FF) : const Color(0xFF111827),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                            onChanged: (val) => setState(() => _agreeTerms = val ?? true),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'I agree to the Terms of Service',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF4B5563),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    _buildSubmitButton(state, isDark),
                    const SizedBox(height: 24),
                    Center(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Already have an account? ',
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                            ),
                          ),
                          InkWell(
                            onTap: widget.onSwitchToLogin,
                            child: Text(
                              'Log In',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFormFields(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Ligne Prénom & Nom
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'First Name',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isDark ? const Color(0xFFD1D5DB) : const Color(0xFF374151)),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _firstNameController,
                    style: TextStyle(color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827)),
                    decoration: InputDecoration(
                      hintText: 'First name',
                      filled: true,
                      fillColor: isDark ? const Color(0xFF1E222B) : const Color(0xFFF9FAFB),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF0066FF) : const Color(0xFF111827), width: 1.5)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Last Name',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isDark ? const Color(0xFFD1D5DB) : const Color(0xFF374151)),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _lastNameController,
                    style: TextStyle(color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827)),
                    decoration: InputDecoration(
                      hintText: 'Last name',
                      filled: true,
                      fillColor: isDark ? const Color(0xFF1E222B) : const Color(0xFFF9FAFB),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF0066FF) : const Color(0xFF111827), width: 1.5)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Champ Email
        Text(
          'Email',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isDark ? const Color(0xFFD1D5DB) : const Color(0xFF374151)),
        ),
        const SizedBox(height: 4),
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          style: TextStyle(color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827)),
          decoration: InputDecoration(
            hintText: 'Enter your email',
            filled: true,
            fillColor: isDark ? const Color(0xFF1E222B) : const Color(0xFFF9FAFB),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF0066FF) : const Color(0xFF111827), width: 1.5)),
          ),
        ),
        const SizedBox(height: 14),

        // Ligne Mot de passe & Code PIN
        Row(
          children: [
            Expanded(
              flex: 3,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Password',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isDark ? const Color(0xFFD1D5DB) : const Color(0xFF374151)),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    style: TextStyle(color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827)),
                    decoration: InputDecoration(
                      hintText: '••••••••',
                      filled: true,
                      fillColor: isDark ? const Color(0xFF1E222B) : const Color(0xFFF9FAFB),
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280), size: 18),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF0066FF) : const Color(0xFF111827), width: 1.5)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'PIN (4 digits)',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isDark ? const Color(0xFFD1D5DB) : const Color(0xFF374151)),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    controller: _pinController,
                    keyboardType: TextInputType.number,
                    maxLength: 4,
                    style: TextStyle(color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827), fontFamily: 'RobotoMono', letterSpacing: 2),
                    decoration: InputDecoration(
                      hintText: '1234',
                      counterText: '',
                      filled: true,
                      fillColor: isDark ? const Color(0xFF1E222B) : const Color(0xFFF9FAFB),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: isDark ? const Color(0xFF0066FF) : const Color(0xFF111827), width: 1.5)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSubmitButton(AuthState state, bool isDark) {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: isDark ? const Color(0xFF0066FF) : const Color(0xFF111827),
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        elevation: 0,
      ),
      onPressed: state.status == AuthStatus.loading ? null : _submitRegister,
      child: state.status == AuthStatus.loading
          ? const SizedBox(
              height: 20,
              width: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            )
          : const Text(
              'Create Account',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 0.2),
            ),
    );
  }

  Widget _buildFallbackIllustration(bool isDark) {
    return Container(
      color: isDark ? const Color(0xFF0F1115) : const Color(0xFFE5E7EB),
      child: const Center(
        child: Icon(Icons.person_add_alt_1, size: 80, color: Color(0xFF0066FF)),
      ),
    );
  }
}
