import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';

class PinLockScreen extends StatefulWidget {
  final VoidCallback? onSwitchToLogin;

  const PinLockScreen({
    super.key,
    this.onSwitchToLogin,
  });

  @override
  State<PinLockScreen> createState() => _PinLockScreenState();
}

class _PinLockScreenState extends State<PinLockScreen> {
  String _enteredPin = '';

  void _onKeypadTap(String value) {
    if (_enteredPin.length < 6) {
      setState(() {
        _enteredPin += value;
      });

      if (_enteredPin.length == 4) {
        context.read<AuthBloc>().add(UnlockWithPinEvent(pin: _enteredPin));
      }
    }
  }

  void _onBackspace() {
    if (_enteredPin.isNotEmpty) {
      setState(() {
        _enteredPin = _enteredPin.substring(0, _enteredPin.length - 1);
      });
    }
  }

  void _onClear() {
    setState(() {
      _enteredPin = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F1115),
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state.errorMessage != null && state.errorMessage!.isNotEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage!),
                backgroundColor: const Color(0xFFB91C1C),
              ),
            );
            setState(() {
              _enteredPin = '';
            });
          }
        },
        builder: (context, state) {
          final user = state.currentUser;
          final shop = state.activeShop;

          return Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Container(
                constraints: const BoxConstraints(maxWidth: 380),
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: const Color(0xFF16191F),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFF282D37), width: 1),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Avatar & Profil Opérateur
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E222B),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: const Color(0xFF282D37)),
                      ),
                      child: Center(
                        child: Text(
                          user != null && user.firstName.isNotEmpty ? user.firstName[0].toUpperCase() : 'U',
                          style: const TextStyle(fontSize: 22, color: Color(0xFFF3F4F6), fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      user?.fullName ?? 'Opérateur de Caisse',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFFF3F4F6)),
                    ),
                    Text(
                      '${shop?.name ?? "Boutique"} • ${user?.globalRole ?? "CAISSIER"}',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                    ),
                    const Divider(height: 28),

                    // Indicateurs de PIN (cercles stricts)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(4, (index) {
                        final isFilled = index < _enteredPin.length;
                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 8),
                          width: 14,
                          height: 14,
                          decoration: BoxDecoration(
                            color: isFilled ? const Color(0xFF0066FF) : const Color(0xFF1E222B),
                            borderRadius: BorderRadius.circular(3),
                            border: Border.all(
                              color: isFilled ? const Color(0xFF0066FF) : const Color(0xFF282D37),
                              width: 1,
                            ),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 24),

                    // Pavé Numérique Tactile (56px min hauteur de touches)
                    GridView.count(
                      crossAxisCount: 3,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      childAspectRatio: 1.4,
                      children: [
                        for (var i = 1; i <= 9; i++) _buildKeypadButton('$i'),
                        _buildActionButton(Icons.clear, _onClear),
                        _buildKeypadButton('0'),
                        _buildActionButton(Icons.backspace_outlined, _onBackspace),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Bouton Changer d'opérateur / Déconnexion
                    TextButton.icon(
                      onPressed: widget.onSwitchToLogin ?? () => context.read<AuthBloc>().add(LogoutEvent()),
                      icon: const Icon(Icons.swap_horiz, size: 16, color: Color(0xFF9CA3AF)),
                      label: const Text('Changer d\'utilisateur / Connexion email', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12)),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildKeypadButton(String digit) {
    return Material(
      color: const Color(0xFF1E222B),
      borderRadius: BorderRadius.circular(4),
      child: InkWell(
        borderRadius: BorderRadius.circular(4),
        onTap: () => _onKeypadTap(digit),
        child: Center(
          child: Text(
            digit,
            style: const TextStyle(
              fontSize: 20,
              fontFamily: 'RobotoMono',
              fontWeight: FontWeight.bold,
              color: Color(0xFFF3F4F6),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton(IconData icon, VoidCallback onTap) {
    return Material(
      color: const Color(0xFF1E222B),
      borderRadius: BorderRadius.circular(4),
      child: InkWell(
        borderRadius: BorderRadius.circular(4),
        onTap: onTap,
        child: Center(
          child: Icon(icon, color: const Color(0xFF9CA3AF), size: 20),
        ),
      ),
    );
  }
}
