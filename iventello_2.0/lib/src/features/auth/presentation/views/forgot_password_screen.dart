import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/widgets/iventello_logo.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';

class ForgotPasswordScreen extends StatefulWidget {
  final VoidCallback onBackToLogin;

  const ForgotPasswordScreen({
    super.key,
    required this.onBackToLogin,
  });

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  int _step = 0; // 0: Demande Email, 1: Saisie Code & Nouveau Mot de Passe
  final _emailController = TextEditingController();
  final _codeController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscureNewPass = true;

  @override
  void dispose() {
    _emailController.dispose();
    _codeController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _sendCode() {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez renseigner votre adresse email.'),
          backgroundColor: Color(0xFFB91C1C),
        ),
      );
      return;
    }

    context.read<AuthBloc>().add(SendPasswordResetOtpEvent(email: email));
    setState(() {
      _step = 1;
    });
  }

  void _submitReset() {
    final email = _emailController.text.trim();
    final code = _codeController.text.trim();
    final newPass = _newPasswordController.text;
    final confirmPass = _confirmPasswordController.text;

    if (code.isEmpty || newPass.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez remplir le code de vérification et le mot de passe.'),
          backgroundColor: Color(0xFFB91C1C),
        ),
      );
      return;
    }

    if (newPass != confirmPass) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Les deux mots de passe ne correspondent pas.'),
          backgroundColor: Color(0xFFB91C1C),
        ),
      );
      return;
    }

    context.read<AuthBloc>().add(
          ResetPasswordWithPinOrCodeEvent(
            email: email,
            pinOrCode: code,
            newPassword: newPass,
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
            final isSuccess = state.errorMessage!.contains('succès') || state.errorMessage!.contains('envoyé');
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage!),
                backgroundColor: isSuccess ? const Color(0xFF15803D) : const Color(0xFFB91C1C),
              ),
            );
            if (state.errorMessage!.contains('mis à jour avec succès')) {
              widget.onBackToLogin();
            }
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
              'assets/onboarding/Stock Management - Low Stock Alert.png',
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
                            _step == 0 ? 'Forgot password?' : 'Reset your password',
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
                            _step == 0
                                ? 'Enter your email to receive a 6-digit verification code.'
                                : 'Enter the code sent to your email and choose a new password.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                            ),
                          ),
                        ),
                        const SizedBox(height: 36),

                        // Formulaire selon l'étape
                        if (_step == 0) _buildStep0Email(isDark),
                        if (_step == 1) _buildStep1CodeAndPass(state, isDark),

                        const SizedBox(height: 32),

                        // Lien Retour Connexion
                        Center(
                          child: InkWell(
                            onTap: widget.onBackToLogin,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.arrow_back,
                                  size: 16,
                                  color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF4B5563),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Back to log in',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827),
                                  ),
                                ),
                              ],
                            ),
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
            const SizedBox(height: 20),

            Center(
              child: Text(
                _step == 0 ? 'Forgot password?' : 'Reset password',
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
                _step == 0
                    ? 'Enter your email to receive a code'
                    : 'Enter the verification code and new password',
                textAlign: TextAlign.center,
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
                    if (_step == 0) _buildStep0Email(isDark),
                    if (_step == 1) _buildStep1CodeAndPass(state, isDark),
                    const SizedBox(height: 32),
                    Center(
                      child: InkWell(
                        onTap: widget.onBackToLogin,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.arrow_back,
                              size: 16,
                              color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF4B5563),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Back to log in',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827),
                              ),
                            ),
                          ],
                        ),
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

  Widget _buildStep0Email(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
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
          onSubmitted: (_) => _sendCode(),
        ),
        const SizedBox(height: 28),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: isDark ? const Color(0xFF0066FF) : const Color(0xFF111827),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            elevation: 0,
          ),
          onPressed: _sendCode,
          child: const Text(
            'Send verification code',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  Widget _buildStep1CodeAndPass(AuthState state, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Champ Code
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '6-digit Code',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isDark ? const Color(0xFFD1D5DB) : const Color(0xFF374151),
              ),
            ),
            InkWell(
              onTap: _sendCode,
              child: Text(
                'Resend code',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF2563EB),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _codeController,
          keyboardType: TextInputType.number,
          maxLength: 6,
          style: TextStyle(
            color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827),
            fontFamily: 'RobotoMono',
            letterSpacing: 4,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
          decoration: InputDecoration(
            hintText: '123456',
            counterText: '',
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
        const SizedBox(height: 16),

        // Nouveau mot de passe
        Text(
          'New Password',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isDark ? const Color(0xFFD1D5DB) : const Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _newPasswordController,
          obscureText: _obscureNewPass,
          style: TextStyle(color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827)),
          decoration: InputDecoration(
            hintText: '••••••••',
            filled: true,
            fillColor: isDark ? const Color(0xFF1E222B) : const Color(0xFFF9FAFB),
            suffixIcon: IconButton(
              icon: Icon(
                _obscureNewPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF6B7280),
                size: 20,
              ),
              onPressed: () => setState(() => _obscureNewPass = !_obscureNewPass),
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
        ),
        const SizedBox(height: 16),

        // Confirmation mot de passe
        Text(
          'Confirm Password',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isDark ? const Color(0xFFD1D5DB) : const Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _confirmPasswordController,
          obscureText: _obscureNewPass,
          style: TextStyle(color: isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827)),
          decoration: InputDecoration(
            hintText: '••••••••',
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
          onSubmitted: (_) => _submitReset(),
        ),
        const SizedBox(height: 28),

        // Bouton Réinitialiser
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: isDark ? const Color(0xFF0066FF) : const Color(0xFF111827),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            elevation: 0,
          ),
          onPressed: state.status == AuthStatus.loading ? null : _submitReset,
          child: state.status == AuthStatus.loading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Text(
                  'Reset password',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
        ),
      ],
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
        child: Icon(Icons.lock_reset, size: 80, color: Color(0xFF0066FF)),
      ),
    );
  }
}
