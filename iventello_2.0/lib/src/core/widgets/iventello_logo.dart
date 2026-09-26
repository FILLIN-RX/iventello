import 'package:flutter/material.dart';

class IventelloLogo extends StatelessWidget {
  final double size;
  final bool showText;
  final Color? textColor;

  const IventelloLogo({
    super.key,
    this.size = 48,
    this.showText = false,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Widget imageWidget = ClipRRect(
      borderRadius: BorderRadius.circular(size * 0.18),
      child: Image.asset(
        'assets/iventello.png',
        width: size,
        height: size,
        fit: BoxFit.contain,
        filterQuality: FilterQuality.medium,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: const Color(0xFF0066FF),
              borderRadius: BorderRadius.circular(size * 0.22),
            ),
            child: Center(
              child: Text(
                'I',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: size * 0.55,
                ),
              ),
            ),
          );
        },
      ),
    );

    if (!showText) {
      return imageWidget;
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        imageWidget,
        const SizedBox(width: 12),
        Text(
          'IVENTELLO',
          style: TextStyle(
            fontSize: size * 0.45,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
            color: textColor ?? (isDark ? const Color(0xFFF3F4F6) : const Color(0xFF111827)),
          ),
        ),
      ],
    );
  }
}
