import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';

/// Screen shown to Service Providers / Agents whose KYC documents
/// have been submitted and are awaiting admin approval.
/// This screen BLOCKS access to the main app until status changes
/// from 'pending_review' to 'approved' / 'verified'.
class PendingApprovalScreen extends StatelessWidget {
  const PendingApprovalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final profile = authProvider.userProfile;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
          child: Column(
            children: [
              const Spacer(flex: 2),

              // Animated clock illustration
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0.0, end: 1.0),
                duration: const Duration(milliseconds: 800),
                curve: Curves.elasticOut,
                builder: (context, value, child) {
                  return Transform.scale(
                    scale: value,
                    child: child,
                  );
                },
                child: Container(
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primary.withValues(alpha: 0.15),
                        blurRadius: 40,
                        spreadRadius: 8,
                      ),
                    ],
                  ),
                  child: const Icon(
                    LucideIcons.clockAlert,
                    size: 64,
                    color: Color(0xFF1D4ED8),
                  ),
                ),
              ),

              const SizedBox(height: 36),

              // Title
              Text(
                'Verification in Progress',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 14),

              // Description
              Text(
                'Your identity documents have been submitted and are currently being reviewed by the Wheel of Comfort compliance team.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                  height: 1.5,
                ),
              ),

              const SizedBox(height: 28),

              // Status info card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Column(
                  children: [
                    _buildInfoRow(
                      icon: LucideIcons.user,
                      label: 'Name',
                      value: profile?.fullName ?? '—',
                    ),
                    const Divider(height: 20),
                    _buildInfoRow(
                      icon: LucideIcons.mail,
                      label: 'Email',
                      value: profile?.email ?? '—',
                    ),
                    const Divider(height: 20),
                    _buildInfoRow(
                      icon: LucideIcons.briefcase,
                      label: 'Role',
                      value: _formatRole(profile?.role ?? ''),
                    ),
                    const Divider(height: 20),
                    _buildInfoRow(
                      icon: LucideIcons.shieldCheck,
                      label: 'Status',
                      value: 'Pending Review',
                      valueColor: const Color(0xFF1D4ED8),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // What happens next
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(LucideIcons.info, color: Color(0xFFB45309), size: 20),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'What happens next?',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: Color(0xFFB45309),
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Our team typically reviews documents within 24–48 hours. You will receive a notification once your account is verified and unlocked.',
                            style: TextStyle(
                              fontSize: 12,
                              color: Color(0xFFB45309),
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const Spacer(flex: 2),

              // Refresh button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: OutlinedButton.icon(
                  onPressed: authProvider.isLoading
                      ? null
                      : () async {
                          if (authProvider.user != null) {
                            await authProvider.fetchProfile(authProvider.user!.uid);
                          }
                        },
                  icon: authProvider.isLoading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(LucideIcons.refreshCw, size: 18),
                  label: Text(
                    authProvider.isLoading ? 'Checking...' : 'Check Approval Status',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    side: const BorderSide(color: AppTheme.primary),
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Sign out
              TextButton.icon(
                onPressed: () => authProvider.signOut(),
                icon: const Icon(LucideIcons.logOut, size: 16, color: AppTheme.error),
                label: const Text(
                  'Sign Out',
                  style: TextStyle(color: AppTheme.error, fontWeight: FontWeight.w500),
                ),
              ),

              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.textSecondary),
        const SizedBox(width: 10),
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            color: AppTheme.textSecondary,
          ),
        ),
        const Spacer(),
        Flexible(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: valueColor ?? AppTheme.textPrimary,
            ),
            textAlign: TextAlign.right,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  String _formatRole(String role) {
    switch (role) {
      case 'service_provider':
        return 'Service Provider';
      case 'agent':
        return 'Real Estate Agent';
      case 'user':
        return 'Client';
      default:
        return role;
    }
  }
}
