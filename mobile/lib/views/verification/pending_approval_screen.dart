import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme.dart';
import '../../core/design_system/design_system.dart';
import '../../core/app_logo.dart';
import '../../providers/auth_provider.dart';
import 'document_upload_screen.dart';

/// Screen shown to Service Providers / Agents whose KYC documents
/// have been submitted and are awaiting admin approval or require updates.
class PendingApprovalScreen extends StatelessWidget {
  const PendingApprovalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final profile = authProvider.userProfile;
    final isRejected = profile?.isRejected == true;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        centerTitle: true,
        title: const AppLogo(height: 32, alignment: Alignment.center),
        // Only show a back arrow when this screen was pushed on top of another
        // (e.g. from Profile). As the root gate, there is nowhere to go back to.
        leading: Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(LucideIcons.arrowLeft, color: AppTheme.textPrimary),
                tooltip: 'Back',
                onPressed: () => Navigator.pop(context),
              )
            : null,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Column(
            children: [
              const SizedBox(height: 8),

              // Animated illustration (Clock for pending, Alert for rejected)
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
                    color: isRejected ? AppTheme.errorLight : AppTheme.secondaryLight,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: (isRejected ? AppTheme.error : AppTheme.brandOrange).withValues(alpha: 0.2),
                        blurRadius: 40,
                        spreadRadius: 8,
                      ),
                    ],
                  ),
                  child: Icon(
                    isRejected ? LucideIcons.alertTriangle : LucideIcons.clockAlert,
                    size: 64,
                    color: isRejected ? AppTheme.error : AppTheme.brandOrange,
                  ),
                ),
              ),

              const SizedBox(height: 28),

              // Title
              Text(
                isRejected ? 'Application Needs Updates' : 'Verification in Progress',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 12),

              // Description
              Text(
                isRejected
                    ? (profile?.rejectionReason != null && profile!.rejectionReason!.isNotEmpty
                        ? profile.rejectionReason!
                        : 'The compliance team has reviewed your documents and requested changes before approving your provider account.')
                    : 'Your identity documents and trade portfolio have been submitted and are currently being reviewed by the Wheel of Comfort compliance team.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: isRejected ? const Color(0xFFB91C1C) : AppTheme.textSecondary,
                  height: 1.5,
                ),
              ),

              const SizedBox(height: 24),

              // Status info card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isRejected ? const Color(0xFFFECACA) : AppTheme.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
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
                      icon: isRejected ? LucideIcons.alertCircle : LucideIcons.shieldCheck,
                      label: 'Status',
                      value: isRejected ? 'Updates Required' : 'Pending Review',
                      valueColor: isRejected ? AppTheme.error : AppTheme.brandOrange,
                    ),
                    if (isRejected && profile?.rejectionReason != null && profile!.rejectionReason!.isNotEmpty) ...[
                      const Divider(height: 20),
                      _buildInfoRow(
                        icon: LucideIcons.messageSquare,
                        label: 'Reason',
                        value: profile.rejectionReason!,
                        valueColor: const Color(0xFFDC2626),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // What happens next banner
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isRejected ? const Color(0xFFFEF2F2) : const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isRejected
                        ? const Color(0xFFFECACA)
                        : const Color(0xFFF59E0B).withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      isRejected ? LucideIcons.alertTriangle : LucideIcons.info,
                      color: isRejected ? const Color(0xFFDC2626) : const Color(0xFFB45309),
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isRejected ? 'How to resolve this?' : 'What happens next?',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: isRejected ? const Color(0xFF991B1B) : const Color(0xFFB45309),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            isRejected
                                ? 'Tap the button below to review your documents and upload clearer photos of your Government ID, passport photograph, or proof of work.'
                                : 'Our team typically reviews documents within 24–48 hours. You will receive an email and notification once your account is verified and unlocked.',
                            style: TextStyle(
                              fontSize: 12,
                              color: isRejected ? const Color(0xFFB91C1C) : const Color(0xFFB45309),
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // If rejected: Primary button is "Update & Re-Submit Documents"
              if (isRejected) ...[
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const DocumentUploadScreen()),
                      );
                    },
                    icon: const Icon(LucideIcons.uploadCloud, size: 18),
                    label: const Text(
                      'Update & Re-Submit Documents',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ] else ...[
                // Refresh button for pending
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: OutlinedButton.icon(
                    onPressed: authProvider.isLoading
                        ? null
                        : () async {
                            if (authProvider.user != null) {
                              await authProvider.fetchProfile(authProvider.user!.uid);
                              if (context.mounted) {
                                final updated = authProvider.userProfile;
                                if (updated != null && updated.isVerified) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Congratulations! Your account is now verified and active.'),
                                      backgroundColor: AppTheme.accent,
                                    ),
                                  );
                                  // AuthWrapper reacts to the approved status and
                                  // shows the role's dashboard at the root.
                                  Navigator.of(context).popUntil((route) => route.isFirst);
                                } else if (updated != null && updated.isRejected) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Application rejected: ${updated.rejectionReason ?? "Updates needed"}'),
                                      backgroundColor: AppTheme.error,
                                      duration: const Duration(seconds: 4),
                                    ),
                                  );
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => const DocumentUploadScreen()),
                                  );
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Your account is still under review by our compliance team.'),
                                      duration: Duration(seconds: 3),
                                    ),
                                  );
                                }
                              }
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
              ],

              const SizedBox(height: 24),

              // What gets unlocked after approval (role-specific)
              _buildUnlockCard(profile?.role ?? ''),

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

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUnlockCard(String role) {
    final isAgent = role == 'agent';
    final items = isAgent
        ? const [
            (LucideIcons.building2, 'Publish property listings', 'List rentals and sales visible to verified clients.'),
            (LucideIcons.messageSquare, 'Receive client enquiries', 'Chat directly with interested tenants and buyers.'),
            (LucideIcons.badgeCheck, 'Verified agent badge', 'Stand out as a trusted, compliance-checked agent.'),
          ]
        : const [
            (LucideIcons.briefcase, 'Receive job requests', 'Get matched with clients who need your trade.'),
            (LucideIcons.messageSquare, 'Chat with clients', 'Agree on scope, timing and pricing in-app.'),
            (LucideIcons.wallet, 'Guaranteed escrow payouts', 'Clients pay upfront; funds release when work is done.'),
          ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(LucideIcons.lockKeyhole, size: 16, color: AppTheme.textSecondary),
              SizedBox(width: 8),
              Text(
                'UNLOCKED AFTER APPROVAL',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.6,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          for (final (icon, title, subtitle) in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, size: 18, color: AppTheme.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        const SizedBox(height: 2),
                        Text(
                          subtitle,
                          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
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
