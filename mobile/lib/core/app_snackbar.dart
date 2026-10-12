import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'theme.dart';

/// Reusable utility to present sleek, modern, floating feedback cards (errors, successes, notices)
/// instead of harsh, edge-to-edge raw system snackbars.
class AppSnackBar {
  static void showError(
    BuildContext context,
    String message, {
    String? title,
    Duration duration = const Duration(seconds: 4),
    VoidCallback? onAction,
    String? actionLabel,
  }) {
    _showCustomSnackBar(
      context: context,
      message: message,
      title: title ?? 'Authentication Error',
      icon: LucideIcons.alertCircle,
      accentColor: const Color(0xFFEF4444), // red-500
      backgroundColor: const Color(0xFF1E293B), // slate-800 for high-contrast premium feel
      iconBgColor: const Color(0xFFEF4444).withValues(alpha: 0.15),
      iconColor: const Color(0xFFF87171),
      duration: duration,
      onAction: onAction,
      actionLabel: actionLabel,
    );
  }

  static void showSuccess(
    BuildContext context,
    String message, {
    String? title,
    Duration duration = const Duration(seconds: 4),
  }) {
    _showCustomSnackBar(
      context: context,
      message: message,
      title: title ?? 'Success',
      icon: LucideIcons.checkCircle2,
      accentColor: const Color(0xFF10B981), // emerald-500
      backgroundColor: const Color(0xFF0F172A), // slate-900
      iconBgColor: const Color(0xFF10B981).withValues(alpha: 0.15),
      iconColor: const Color(0xFF34D399),
      duration: duration,
    );
  }

  static void showInfo(
    BuildContext context,
    String message, {
    String? title,
    Duration duration = const Duration(seconds: 4),
  }) {
    _showCustomSnackBar(
      context: context,
      message: message,
      title: title,
      icon: LucideIcons.info,
      accentColor: AppTheme.primary,
      backgroundColor: const Color(0xFF0F172A),
      iconBgColor: AppTheme.primary.withValues(alpha: 0.15),
      iconColor: const Color(0xFF38BDF8),
      duration: duration,
    );
  }

  static void _showCustomSnackBar({
    required BuildContext context,
    required String message,
    String? title,
    required IconData icon,
    required Color accentColor,
    required Color backgroundColor,
    required Color iconBgColor,
    required Color iconColor,
    required Duration duration,
    VoidCallback? onAction,
    String? actionLabel,
  }) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();

    messenger.showSnackBar(
      SnackBar(
        elevation: 8,
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.transparent,
        duration: duration,
        padding: EdgeInsets.zero,
        margin: const EdgeInsets.only(left: 16, right: 16, bottom: 24),
        content: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: accentColor.withValues(alpha: 0.35), width: 1.2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.25),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon Badge
              Container(
                margin: const EdgeInsets.only(top: 2),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconBgColor,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 12),

              // Text Content
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (title != null && title.isNotEmpty) ...[
                      Text(
                        title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.2,
                        ),
                      ),
                      const SizedBox(height: 3),
                    ],
                    Text(
                      message,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.88),
                        fontSize: 13,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),

              // Action button or Dismiss
              if (onAction != null && actionLabel != null) ...[
                const SizedBox(width: 8),
                TextButton(
                  onPressed: () {
                    messenger.hideCurrentSnackBar();
                    onAction();
                  },
                  style: TextButton.styleFrom(
                    foregroundColor: accentColor,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  child: Text(
                    actionLabel,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
              ] else ...[
                const SizedBox(width: 4),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                  icon: Icon(
                    LucideIcons.x,
                    color: Colors.white.withValues(alpha: 0.5),
                    size: 16,
                  ),
                  onPressed: () => messenger.hideCurrentSnackBar(),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
