import 'package:flutter/material.dart';
import '../theme.dart';

enum BrandBadgeVariant {
  green, // Emerald Green (#10B981)
  orange, // Brand Orange (#FD7E14)
  neutral, // Slate Grey (#64748B)
  error, // Crimson Red (#EF4444)
}

/// Official Wheelhomes Design System Badge & Status Chip Component
class BrandBadge extends StatelessWidget {
  final String label;
  final BrandBadgeVariant variant;
  final IconData? icon;
  final bool hasDot;
  final double fontSize;
  final EdgeInsetsGeometry padding;

  const BrandBadge({
    super.key,
    required this.label,
    this.variant = BrandBadgeVariant.green,
    this.icon,
    this.hasDot = false,
    this.fontSize = 11.5,
    this.padding = const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
  });

  const BrandBadge.green({
    super.key,
    required this.label,
    this.icon,
    this.hasDot = false,
    this.fontSize = 11.5,
    this.padding = const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
  }) : variant = BrandBadgeVariant.green;

  const BrandBadge.orange({
    super.key,
    required this.label,
    this.icon,
    this.hasDot = false,
    this.fontSize = 11.5,
    this.padding = const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
  }) : variant = BrandBadgeVariant.orange;

  const BrandBadge.neutral({
    super.key,
    required this.label,
    this.icon,
    this.hasDot = false,
    this.fontSize = 11.5,
    this.padding = const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
  }) : variant = BrandBadgeVariant.neutral;

  const BrandBadge.error({
    super.key,
    required this.label,
    this.icon,
    this.hasDot = false,
    this.fontSize = 11.5,
    this.padding = const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
  }) : variant = BrandBadgeVariant.error;

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color border;
    Color text;
    Color dot;

    switch (variant) {
      case BrandBadgeVariant.green:
        bg = AppTheme.primaryLight;
        border = AppTheme.primaryBorder;
        text = AppTheme.primaryDark;
        dot = AppTheme.primary;
        break;
      case BrandBadgeVariant.orange:
        bg = AppTheme.secondaryLight;
        border = AppTheme.secondaryBorder;
        text = AppTheme.secondaryDeep;
        dot = AppTheme.brandOrange;
        break;
      case BrandBadgeVariant.neutral:
        bg = AppTheme.slateLight;
        border = AppTheme.border;
        text = AppTheme.slateMedium;
        dot = AppTheme.slateMuted;
        break;
      case BrandBadgeVariant.error:
        bg = AppTheme.errorLight;
        border = AppTheme.errorBorder;
        text = AppTheme.error;
        dot = AppTheme.error;
        break;
    }

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: border, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (hasDot) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: dot,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 5),
          ],
          if (icon != null) ...[
            Icon(icon, size: fontSize + 2, color: text),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w600,
              color: text,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}
