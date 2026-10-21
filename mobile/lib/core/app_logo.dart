import 'package:flutter/material.dart';

/// Official Wheel of Comfort & Multipurpose Services App Logo widget.
class AppLogo extends StatelessWidget {
  final double height;
  final double? width;
  final BoxFit fit;
  final AlignmentGeometry alignment;

  const AppLogo({
    super.key,
    this.height = 48,
    this.width,
    this.fit = BoxFit.contain,
    this.alignment = Alignment.centerLeft,
  });

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/images/logo.png',
      height: height,
      width: width,
      fit: fit,
      alignment: alignment,
      errorBuilder: (context, error, stackTrace) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.home_rounded, color: Color(0xFF10B981), size: 26),
            const SizedBox(width: 8),
            Text(
              'Wheel of Comfort',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: height * 0.4,
                color: const Color(0xFF0F172A),
              ),
            ),
          ],
        );
      },
    );
  }
}
