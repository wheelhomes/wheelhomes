import 'package:flutter/material.dart';
import '../theme.dart';

enum BrandButtonVariant {
  primary, // Emerald Green Gradient
  secondary, // Warm Orange Gradient
  outline, // Emerald Green Outline
  outlineOrange, // Orange Outline
  ghost, // Subtle Slate
}

/// Official Wheelhomes Design System Button Component
class BrandButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final BrandButtonVariant variant;
  final IconData? icon;
  final bool isLoading;
  final bool fullWidth;
  final double height;
  final double? width;

  const BrandButton({
    super.key,
    required this.text,
    this.onPressed,
    this.variant = BrandButtonVariant.primary,
    this.icon,
    this.isLoading = false,
    this.fullWidth = true,
    this.height = 50,
    this.width,
  });

  const BrandButton.primary({
    super.key,
    required this.text,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.fullWidth = true,
    this.height = 50,
    this.width,
  }) : variant = BrandButtonVariant.primary;

  const BrandButton.secondary({
    super.key,
    required this.text,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.fullWidth = true,
    this.height = 50,
    this.width,
  }) : variant = BrandButtonVariant.secondary;

  const BrandButton.outline({
    super.key,
    required this.text,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.fullWidth = true,
    this.height = 50,
    this.width,
  }) : variant = BrandButtonVariant.outline;

  const BrandButton.outlineOrange({
    super.key,
    required this.text,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.fullWidth = true,
    this.height = 50,
    this.width,
  }) : variant = BrandButtonVariant.outlineOrange;

  @override
  Widget build(BuildContext context) {
    final isDisabled = onPressed == null || isLoading;

    final Widget content = Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (isLoading)
          SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2.2,
              valueColor: AlwaysStoppedAnimation<Color>(
                (variant == BrandButtonVariant.outline ||
                        variant == BrandButtonVariant.ghost)
                    ? AppTheme.primary
                    : variant == BrandButtonVariant.outlineOrange
                        ? AppTheme.brandOrange
                        : Colors.white,
              ),
            ),
          )
        else ...[
          if (icon != null) ...[
            Icon(
              icon,
              size: 19,
              color: _getTextColor(isDisabled),
            ),
            const SizedBox(width: 8),
          ],
          Text(
            text,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: _getTextColor(isDisabled),
              letterSpacing: 0.1,
            ),
          ),
        ],
      ],
    );

    Widget buttonBody;

    switch (variant) {
      case BrandButtonVariant.primary:
        buttonBody = Container(
          height: height,
          width: fullWidth ? double.infinity : width,
          decoration: BoxDecoration(
            gradient: isDisabled ? null : AppTheme.primaryGradient,
            color: isDisabled ? const Color(0xFFCBD5E1) : null,
            borderRadius: BorderRadius.circular(12),
            boxShadow: isDisabled ? null : AppTheme.greenGlow(0.2),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: isDisabled ? null : onPressed,
              borderRadius: BorderRadius.circular(12),
              child: Center(child: content),
            ),
          ),
        );
        break;

      case BrandButtonVariant.secondary:
        buttonBody = Container(
          height: height,
          width: fullWidth ? double.infinity : width,
          decoration: BoxDecoration(
            gradient: isDisabled ? null : AppTheme.orangeGradient,
            color: isDisabled ? const Color(0xFFCBD5E1) : null,
            borderRadius: BorderRadius.circular(12),
            boxShadow: isDisabled ? null : AppTheme.orangeGlow(0.2),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: isDisabled ? null : onPressed,
              borderRadius: BorderRadius.circular(12),
              child: Center(child: content),
            ),
          ),
        );
        break;

      case BrandButtonVariant.outline:
        buttonBody = Container(
          height: height,
          width: fullWidth ? double.infinity : width,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDisabled ? AppTheme.border : AppTheme.primary,
              width: 1.6,
            ),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: isDisabled ? null : onPressed,
              borderRadius: BorderRadius.circular(12),
              child: Center(child: content),
            ),
          ),
        );
        break;

      case BrandButtonVariant.outlineOrange:
        buttonBody = Container(
          height: height,
          width: fullWidth ? double.infinity : width,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDisabled ? AppTheme.border : AppTheme.brandOrange,
              width: 1.6,
            ),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: isDisabled ? null : onPressed,
              borderRadius: BorderRadius.circular(12),
              child: Center(child: content),
            ),
          ),
        );
        break;

      case BrandButtonVariant.ghost:
        buttonBody = SizedBox(
          height: height,
          width: fullWidth ? double.infinity : width,
          child: TextButton(
            onPressed: isDisabled ? null : onPressed,
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.textPrimary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: content,
          ),
        );
        break;
    }

    return buttonBody;
  }

  Color _getTextColor(bool isDisabled) {
    if (isDisabled) return const Color(0xFF94A3B8);

    switch (variant) {
      case BrandButtonVariant.primary:
      case BrandButtonVariant.secondary:
        return Colors.white;
      case BrandButtonVariant.outline:
        return AppTheme.primary;
      case BrandButtonVariant.outlineOrange:
        return AppTheme.brandOrange;
      case BrandButtonVariant.ghost:
        return AppTheme.textPrimary;
    }
  }
}
