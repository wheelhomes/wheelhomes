import 'package:flutter/material.dart';
import '../theme.dart';

enum BrandBannerVariant {
  green,
  orange,
  error,
}

/// Official Wheelhomes Design System Banner Component
class BrandBanner extends StatelessWidget {
  final String title;
  final String? message;
  final IconData icon;
  final BrandBannerVariant variant;
  final Widget? action;
  final VoidCallback? onTap;

  const BrandBanner({
    super.key,
    required this.title,
    this.message,
    required this.icon,
    this.variant = BrandBannerVariant.green,
    this.action,
    this.onTap,
  });

  const BrandBanner.green({
    super.key,
    required this.title,
    this.message,
    required this.icon,
    this.action,
    this.onTap,
  }) : variant = BrandBannerVariant.green;

  const BrandBanner.orange({
    super.key,
    required this.title,
    this.message,
    required this.icon,
    this.action,
    this.onTap,
  }) : variant = BrandBannerVariant.orange;

  const BrandBanner.error({
    super.key,
    required this.title,
    this.message,
    required this.icon,
    this.action,
    this.onTap,
  }) : variant = BrandBannerVariant.error;

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color border;
    Color iconBg;
    Color iconColor;
    Color titleColor;
    Color msgColor;

    switch (variant) {
      case BrandBannerVariant.green:
        bg = AppTheme.primaryLight;
        border = AppTheme.primaryBorder;
        iconBg = AppTheme.primary.withValues(alpha: 0.15);
        iconColor = AppTheme.primaryDark;
        titleColor = AppTheme.primaryDeep;
        msgColor = AppTheme.primaryDark;
        break;

      case BrandBannerVariant.orange:
        bg = AppTheme.secondaryLight;
        border = AppTheme.secondaryBorder;
        iconBg = AppTheme.brandOrange.withValues(alpha: 0.15);
        iconColor = AppTheme.brandOrange;
        titleColor = AppTheme.secondaryDeep;
        msgColor = AppTheme.secondaryDeep.withValues(alpha: 0.85);
        break;

      case BrandBannerVariant.error:
        bg = AppTheme.errorLight;
        border = AppTheme.errorBorder;
        iconBg = AppTheme.error.withValues(alpha: 0.15);
        iconColor = AppTheme.error;
        titleColor = const Color(0xFF991B1B);
        msgColor = const Color(0xFFB91C1C);
        break;
    }

    final card = Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border, width: 1),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: iconBg,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 20, color: iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: titleColor,
                  ),
                ),
                if (message != null) ...[
                  const SizedBox(height: 3),
                  Text(
                    message!,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: msgColor,
                      height: 1.35,
                    ),
                  ),
                ],
                if (action != null) ...[
                  const SizedBox(height: 8),
                  action!,
                ],
              ],
            ),
          ),
        ],
      ),
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: card,
      );
    }

    return card;
  }
}
