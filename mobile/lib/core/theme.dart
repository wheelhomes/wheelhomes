import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Wheelhomes Design System Theme
/// Built around the two official logo brand colors:
/// 1. Brand Green (#21C185 / #10B981) - Roof silhouette & Ampersand
/// 2. Brand Orange (#FD7E14 / #EA580C) - 'Wheel of Comfort & Multipurpose Services' typography
class AppTheme {
  // ── BRAND GREEN PALETTE (Roof & Logo Emblem) ──
  static const Color brandGreen = Color(0xFF21C185); // Exact logo vibrant green
  static const Color primary = Color(0xFF10B981); // Emerald 500 (Accessible Primary CTA)
  static const Color primaryDark = Color(0xFF059669); // Emerald 600 (Pressed/Active states)
  static const Color primaryDeep = Color(0xFF065F46); // Emerald 800 (Dark emerald headers)
  static const Color primaryLight = Color(0xFFECFDF5); // Emerald 50 (Soft surface tint)
  static const Color primaryBorder = Color(0xFFA7F3D0); // Emerald 200 (Subtle badge border)

  // ── BRAND ORANGE PALETTE (Logo Typography & Badges) ──
  static const Color brandOrange = Color(0xFFFD7E14); // Exact logo typography orange
  static const Color secondary = Color(0xFFFD7E14); // Warm brand orange
  static const Color secondaryDark = Color(0xFFEA580C); // Orange 600 (High-contrast active)
  static const Color secondaryDeep = Color(0xFF9A3412); // Orange 800 (Text on orange light)
  static const Color secondaryLight = Color(0xFFFFF7ED); // Orange 50 (Soft amber/orange background)
  static const Color secondaryBorder = Color(0xFFFED7AA); // Orange 200 (Badge border)
  static const Color accent = Color(0xFFFD7E14); // Accent alias

  // ── SUPPORTING SLATE & NEUTRAL PALETTE (Logo Roof Outline & Neutrals) ──
  static const Color slateDark = Color(0xFF0F172A); // Slate 900 (Primary text & headings)
  static const Color slateMedium = Color(0xFF334155); // Slate 700 (Body text)
  static const Color slateMuted = Color(0xFF64748B); // Slate 500 (Subtitles & placeholders)
  static const Color slateLight = Color(0xFFF1F5F9); // Slate 100 (Field fills & inactive tabs)
  static const Color border = Color(0xFFE2E8F0); // Slate 200 (Dividers & borders)
  static const Color background = Color(0xFFF8FAFC); // Slate 50 (App scaffold background)
  static const Color cardBg = Colors.white; // Pure white card surfaces

  // Standard Semantic Colors
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFFD7E14);
  static const Color error = Color(0xFFEF4444);
  static const Color errorLight = Color(0xFFFEF2F2);
  static const Color errorBorder = Color(0xFFFECACA);

  // ── DESIGN SYSTEM GRADIENTS ──
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF21C185), Color(0xFF059669)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient orangeGradient = LinearGradient(
    colors: [Color(0xFFFD7E14), Color(0xFFEA580C)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient brandDualGradient = LinearGradient(
    colors: [Color(0xFF10B981), Color(0xFFFD7E14)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient heroCardGradient = LinearGradient(
    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ── CARD SHADOWS ──
  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: const Color(0xFF0F172A).withValues(alpha: 0.04),
          blurRadius: 10,
          offset: const Offset(0, 3),
        ),
        BoxShadow(
          color: const Color(0xFF0F172A).withValues(alpha: 0.02),
          blurRadius: 2,
          offset: const Offset(0, 1),
        ),
      ];

  static List<BoxShadow> get elevatedShadow => [
        BoxShadow(
          color: const Color(0xFF0F172A).withValues(alpha: 0.08),
          blurRadius: 20,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> greenGlow([double opacity = 0.25]) => [
        BoxShadow(
          color: primary.withValues(alpha: opacity),
          blurRadius: 14,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> orangeGlow([double opacity = 0.25]) => [
        BoxShadow(
          color: brandOrange.withValues(alpha: opacity),
          blurRadius: 14,
          offset: const Offset(0, 4),
        ),
      ];

  // ── THEME DATA ──
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: background,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        primary: primary,
        onPrimary: Colors.white,
        secondary: brandOrange,
        onSecondary: Colors.white,
        tertiary: brandGreen,
        error: error,
        surface: cardBg,
        onSurface: textPrimary,
      ),
      textTheme: GoogleFonts.interTextTheme().copyWith(
        headlineLarge: GoogleFonts.outfit(
          fontSize: 28,
          fontWeight: FontWeight.bold,
          color: textPrimary,
          letterSpacing: -0.5,
        ),
        headlineMedium: GoogleFonts.outfit(
          fontSize: 22,
          fontWeight: FontWeight.bold,
          color: textPrimary,
          letterSpacing: -0.3,
        ),
        titleLarge: GoogleFonts.outfit(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        titleMedium: GoogleFonts.inter(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 16,
          color: textPrimary,
          height: 1.5,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 14,
          color: textSecondary,
          height: 1.45,
        ),
        bodySmall: GoogleFonts.inter(
          fontSize: 12,
          color: textSecondary,
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: textPrimary),
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          side: const BorderSide(color: primary, width: 1.5),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 3,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: primary,
        unselectedItemColor: slateMuted,
        selectedLabelStyle: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
        unselectedLabelStyle: TextStyle(fontSize: 12),
        elevation: 0,
        type: BottomNavigationBarType.fixed,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        hintStyle: const TextStyle(color: slateMuted, fontSize: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: error, width: 2),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF0F172A),
        contentTextStyle: const TextStyle(color: Colors.white, fontSize: 13.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: Colors.white,
        selectedColor: primaryLight,
        side: const BorderSide(color: border),
        labelStyle: const TextStyle(color: textPrimary, fontSize: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
    );
  }
}
