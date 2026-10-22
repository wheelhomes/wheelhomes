import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/design_system/design_system.dart';
import '../../core/app_snackbar.dart';
import '../../core/app_logo.dart';
import '../../providers/auth_provider.dart';

class VerifyEmailScreen extends StatefulWidget {
  const VerifyEmailScreen({super.key});

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  final TextEditingController _otpController = TextEditingController();
  int _cooldown = 0;
  Timer? _timer;
  Timer? _autoCheckTimer;

  @override
  void initState() {
    super.initState();
    // Periodically verify if the user clicked the activation link in their email
    _autoCheckTimer = Timer.periodic(const Duration(seconds: 4), (_) => _autoCheckEmailVerified());
  }

  void _autoCheckEmailVerified() async {
    if (!mounted) return;
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final isVerified = await authProvider.checkEmailVerified();
    if (isVerified && mounted) {
      _autoCheckTimer?.cancel();
      AppSnackBar.showSuccess(
        context,
        'Email verified successfully!',
        title: 'Verified',
      );
    }
  }

  void _startCooldown() {
    setState(() => _cooldown = 60);
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_cooldown <= 1) {
        timer.cancel();
        if (mounted) setState(() => _cooldown = 0);
      } else {
        if (mounted) setState(() => _cooldown--);
      }
    });
  }

  @override
  void dispose() {
    _otpController.dispose();
    _timer?.cancel();
    _autoCheckTimer?.cancel();
    super.dispose();
  }

  void _onVerify() async {
    final code = _otpController.text.trim();
    if (code.length != 6) {
      AppSnackBar.showError(
        context,
        'Please enter the complete 6-digit verification code.',
        title: 'Incomplete Code',
      );
      return;
    }

    FocusScope.of(context).unfocus();
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.verifyEmailOtp(code);

    if (mounted) {
      if (success) {
        AppSnackBar.showSuccess(
          context,
          'Email verified successfully!',
          title: 'Verified',
        );
      } else {
        AppSnackBar.showError(
          context,
          authProvider.errorMessage ?? 'Invalid verification code. Please check your email.',
          title: 'Verification Failed',
        );
      }
    }
  }

  void _onResend() async {
    if (_cooldown > 0) return;
    FocusScope.of(context).unfocus();

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.resendVerificationOtp();

    if (mounted) {
      if (success) {
        _startCooldown();
        AppSnackBar.showInfo(
          context,
          'A new 6-digit verification code and email link have been dispatched to your email.',
          title: 'Verification Sent',
        );
      } else {
        AppSnackBar.showError(
          context,
          authProvider.errorMessage ?? 'Failed to resend code. Please try again.',
          title: 'Notice',
        );
      }
    }
  }

  void _onSignOut() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.signOut();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final userEmail = authProvider.userProfile?.email ?? authProvider.user?.email ?? 'your email';

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28.0, vertical: 24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const AppLogo(height: 52, alignment: Alignment.center),
                const SizedBox(height: 28),

                // Top Icon Badge
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: const Center(
                    child: Icon(
                      LucideIcons.mail,
                      size: 34,
                      color: AppTheme.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Title
                Text(
                  'Verify your Email',
                  style: GoogleFonts.outfit(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 10),

                // Description
                Text(
                  'Enter the 6-digit code sent to\n$userEmail\nto activate your account.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: AppTheme.textSecondary,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 36),

                // 6-digit Code Input
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ENTER 6-DIGIT CODE',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.0,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: TextField(
                        controller: _otpController,
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        maxLength: 6,
                        style: GoogleFonts.robotoMono(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 10,
                          color: AppTheme.textPrimary,
                        ),
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                        ],
                        decoration: const InputDecoration(
                          counterText: '',
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          hintText: '000000',
                          hintStyle: TextStyle(
                            letterSpacing: 10,
                            color: Color(0xFFCBD5E1),
                          ),
                        ),
                        onSubmitted: (_) => _onVerify(),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Verify Button
                BrandButton.primary(
                  text: 'Verify Code',
                  icon: LucideIcons.arrowRight,
                  isLoading: authProvider.isLoading,
                  onPressed: _onVerify,
                  height: 52,
                ),
                const SizedBox(height: 24),

                const Divider(color: Color(0xFFF1F5F9)),
                const SizedBox(height: 16),

                // Resend Code (Brand Orange Accent)
                TextButton.icon(
                  onPressed: (_cooldown > 0 || authProvider.isLoading) ? null : _onResend,
                  icon: const Icon(LucideIcons.refreshCw, size: 15),
                  label: Text(
                    _cooldown > 0 ? 'Resend code in ${_cooldown}s' : 'Resend Code',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: TextButton.styleFrom(
                    foregroundColor: AppTheme.brandOrange,
                    disabledForegroundColor: const Color(0xFF94A3B8),
                  ),
                ),

                // Sign Out
                TextButton.icon(
                  onPressed: authProvider.isLoading ? null : _onSignOut,
                  icon: const Icon(LucideIcons.logOut, size: 14),
                  label: Text(
                    'Wrong email? Sign out',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
