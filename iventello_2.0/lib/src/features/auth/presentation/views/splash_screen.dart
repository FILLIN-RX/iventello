import 'package:flutter/material.dart';
import '../../../../core/widgets/iventello_logo.dart';

class SplashScreen extends StatefulWidget {
  final VoidCallback onInitialized;

  const SplashScreen({
    super.key,
    required this.onInitialized,
  });

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  String _statusMessage = 'Initialisation du moteur SQLite WAL...';

  @override
  void initState() {
    super.initState();
    _startBootSequence();
  }

  Future<void> _startBootSequence() async {
    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;
    setState(() => _statusMessage = 'Vérification du pont natif Rust ESC/POS...');

    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;
    setState(() => _statusMessage = 'Chargement des magasins et topologies...');

    await Future.delayed(const Duration(milliseconds: 200));
    if (!mounted) return;
    widget.onInitialized();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F1115),
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 420),
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: const Color(0xFF16191F),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: const Color(0xFF282D37), width: 1),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Logo Officiel Iventello
              const Center(
                child: IventelloLogo(size: 64, showText: true),
              ),
              const SizedBox(height: 32),

              // Barre de chargement fine et nette
              const ClipRRect(
                borderRadius: BorderRadius.all(Radius.circular(2)),
                child: LinearProgressIndicator(
                  minHeight: 3,
                  backgroundColor: Color(0xFF1E222B),
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF0066FF)),
                ),
              ),
              const SizedBox(height: 14),

              // Message d'état système
              Text(
                _statusMessage,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF9CA3AF),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
