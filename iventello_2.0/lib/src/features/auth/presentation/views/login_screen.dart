import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/widgets/iventello_logo.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';

class LoginScreen extends StatefulWidget {
  final VoidCallback onForgotPassword;
  final VoidCallback onQuickPin;
  final VoidCallback onGoToSetup;

  const LoginScreen({
    super.key,
    required this.onForgotPassword,
    required this.onQuickPin,
    required this.onGoToSetup,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _rememberMe = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submitLogin() {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez renseigner votre email et mot de passe.'),
          backgroundColor: Color(0xFFB91C1C),
        ),
      );
      return;
    }

    context.read<AuthBloc>().add(
          LoginWithPasswordEvent(
            email: email,
            password: password,
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

  /// Disposition Desktop : Full Screen Split 50% / 50%
  Widget _buildDesktopSplitLayout(BuildContext context, AuthState state, bool isDark) {
    return Row(
      children: [
        // Panneau Gauche : Illustration pleine hauteur 100% Full Bleed
        Expanded(
          flex: 6,
          child: SizedBox(
            width: double.infinity,
            height: double.infinity,
            child: Image.asset(
              'assets/onboarding/Stock Management - Inventory Dashboard.png',
              width: double.infinity,
              height: double.infinity,
              fit: BoxFit.cover,
              alignment: Alignment.center,
              errorBuilder: (_, __, ___) => _buildFallbackIllustration(isDark),
            ),
          ),
        ),

        // Panneau Droit : Formulaire épuré
        Expanded(
          flex: 5,
          child: Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF16191F) : Colors.white,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(28),
                bottomLeft: Radius.circular(28),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.05),
                  blurRadius: 20,
                  offset: const Offset(-4, 0),
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
                        const SizedBox(height: 24),

                        // Titre & Sous-titre
                        Center(
                          child: Text(
                            'Welcome back!',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827),
                              letterSpacing: -0.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Center(
                          child: Text(
                            'Please enter your details',
                            style: TextStyle(
                              fontSize: 14,
                              color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                            ),
                          ),
                        ),
                        const SizedBox(height: 36),

                        // Formulaire Saisie
                        _buildFormFields(isDark),
                        const SizedBox(height: 16),

                        // Ligne Remember me & Mot de passe oublié
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: Checkbox(
                                    value: _rememberMe,
                                    activeColor: isDark ? const Color(0xFF0066FF) : const Color(0xFF111827),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                    onChanged: (val) => setState(() => _rememberMe = val ?? true),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Remember for 30 days',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF4B5563),
                                  ),
                                ),
                              ],
                            ),
                            InkWell(
                              onTap: widget.onForgotPassword,
                              child: Text(
                                'Forgot password?',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF2563EB),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 28),

                        // Bouton Log In Principal
                        _buildSubmitButton(state, isDark),
                        const SizedBox(height: 12),

                        // Bouton Secondaire : PIN Code
                        _buildQuickPinButton(isDark),

                        const SizedBox(height: 28),

                        // Lien Inscription / Configuration
                        Center(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Don\'t have an account? ',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                                ),
                              ),
                              InkWell(
                                onTap: widget.onGoToSetup,
                                child: Text(
                                  'Sign Up',
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
      ],
    );
  }

  /// Disposition Mobile : Plein écran sans boîte de carte
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
            const SizedBox(height: 20),

            Center(
              child: Text(
                'Welcome back!',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827),
                ),
              ),
            ),
            const SizedBox(height: 4),
            Center(
              child: Text(
                'Please enter your details',
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                ),
              ),
            ),
            const SizedBox(height: 28),

            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildFormFields(isDark),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            SizedBox(
                              width: 20,
                              height: 20,
                              child: Checkbox(
                                value: _rememberMe,
                                activeColor: isDark ? const Color(0xFF0066FF) : const Color(0xFF111827),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                onChanged: (val) => setState(() => _rememberMe = val ?? true),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Remember me',
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF4B5563),
                              ),
                            ),
                          ],
                        ),
                        InkWell(
                          onTap: widget.onForgotPassword,
                          child: Text(
                            'Forgot password?',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF2563EB),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    _buildSubmitButton(state, isDark),
                    const SizedBox(height: 12),
                    _buildQuickPinButton(isDark),
                    const SizedBox(height: 32),
                    Center(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Don\'t have an account? ',
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                            ),
                          ),
                          InkWell(
                            onTap: widget.onGoToSetup,
                            child: Text(
                              'Sign Up',
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
        Text(
          'Email',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isDark ? const Color(0xFFD1D5DB) : const Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          style: TextStyle(color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827)),
          decoration: InputDecoration(
            hintText: 'Enter your email',
            filled: true,
            fillColor: isDark ? const Color(0xFF1E222B) : const Color(0xFFF9FAFB),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: isDark ? const Color(0xFF0066FF) : const Color(0xFF111827), width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 18),

        Text(
          'Password',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isDark ? const Color(0xFFD1D5DB) : const Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          style: TextStyle(color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827)),
          decoration: InputDecoration(
            hintText: '••••••••',
            filled: true,
            fillColor: isDark ? const Color(0xFF1E222B) : const Color(0xFFF9FAFB),
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                size: 20,
              ),
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: isDark ? const Color(0xFF0066FF) : const Color(0xFF111827), width: 1.5),
            ),
          ),
          onSubmitted: (_) => _submitLogin(),
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
      onPressed: state.status == AuthStatus.loading ? null : _submitLogin,
      child: state.status == AuthStatus.loading
          ? const SizedBox(
              height: 20,
              width: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            )
          : const Text(
              'Log In',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 0.2),
            ),
    );
  }

  Widget _buildQuickPinButton(bool isDark) {
    return OutlinedButton.icon(
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 14),
        side: BorderSide(color: isDark ? const Color(0xFF282D37) : const Color(0xFFE5E7EB)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      onPressed: widget.onQuickPin,
      icon: Icon(
        Icons.pin,
        size: 18,
        color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF4B5563),
      ),
      label: Text(
        'Log in with PIN',
        style: TextStyle(
          color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF374151),
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildFallbackIllustration(bool isDark) {
    return Container(
      width: 320,
      height: 320,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF16191F) : Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: const Center(
        child: Icon(Icons.storefront, size: 80, color: Color(0xFF0066FF)),
      ),
    );
  }
}
