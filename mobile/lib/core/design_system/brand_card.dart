import 'package:flutter/material.dart';
import '../theme.dart';

enum BrandCardAccent {
  none,
  green,
  orange,
  dual,
}

/// Official Wheelhomes Design System Card Component
class BrandCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final BrandCardAccent accent;
  final Color? backgroundColor;
  final double borderRadius;
  final Border? border;

  const BrandCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16.0),
    this.margin,
    this.onTap,
    this.accent = BrandCardAccent.none,
    this.backgroundColor,
    this.borderRadius = 16.0,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    Widget content = child;

    if (accent != BrandCardAccent.none) {
      Gradient accentGrad;
      switch (accent) {
        case BrandCardAccent.green:
          accentGrad = AppTheme.primaryGradient;
          break;
        case BrandCardAccent.orange:
          accentGrad = AppTheme.orangeGradient;
          break;
        case BrandCardAccent.dual:
          accentGrad = AppTheme.brandDualGradient;
          break;
        case BrandCardAccent.none:
          accentGrad = AppTheme.primaryGradient;
          break;
      }

      content = Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            height: 3.5,
            decoration: BoxDecoration(
              gradient: accentGrad,
              borderRadius: BorderRadius.vertical(
                top: Radius.circular(borderRadius),
              ),
            ),
          ),
          Padding(
            padding: padding,
            child: child,
          ),
        ],
      );
    } else {
      content = Padding(
        padding: padding,
        child: child,
      );
    }

    final cardDecoration = BoxDecoration(
      color: backgroundColor ?? AppTheme.cardBg,
      borderRadius: BorderRadius.circular(borderRadius),
      border: border ?? Border.all(color: AppTheme.border, width: 1),
      boxShadow: AppTheme.cardShadow,
    );

    if (onTap != null) {
      return Container(
        margin: margin,
        decoration: cardDecoration,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(borderRadius),
            child: content,
          ),
        ),
      );
    }

    return Container(
      margin: margin,
      decoration: cardDecoration,
      child: content,
    );
  }
}
