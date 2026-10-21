import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/image_helper.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/request_provider.dart';
import '../../providers/notification_provider.dart';
import '../notifications/notifications_screen.dart';
import '../verification/document_upload_screen.dart';
import '../verification/pending_approval_screen.dart';
import 'provider_earnings_screen.dart';
import 'provider_ratings_screen.dart';
import 'provider_portfolio_screen.dart';

class ProviderProHubTab extends StatefulWidget {
  const ProviderProHubTab({super.key});

  @override
  State<ProviderProHubTab> createState() => _ProviderProHubTabState();
}

class _ProviderProHubTabState extends State<ProviderProHubTab> {
  bool _isUploadingPhoto = false;

  Future<void> _showPhotoPickerSheet(BuildContext context) async {
    final picker = ImagePicker();

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Update Passport Photograph 📷',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Take a clear front-facing selfie or upload from gallery. Syncs across Web and Mobile.',
                      style: TextStyle(fontSize: 12.5, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.camera, color: AppTheme.primary),
                ),
                title: const Text('Take a Selfie with Camera', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Capture a fresh passport photograph', style: TextStyle(fontSize: 12)),
                onTap: () async {
                  Navigator.pop(sheetContext);
                  final picked = await picker.pickImage(source: ImageSource.camera, imageQuality: 85);
                  if (picked != null && mounted) {
                    _uploadPhoto(File(picked.path));
                  }
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.brandOrange.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.image, color: AppTheme.brandOrange),
                ),
                title: const Text('Choose from Photo Gallery', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Select existing passport headshot', style: TextStyle(fontSize: 12)),
                onTap: () async {
                  Navigator.pop(sheetContext);
                  final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
                  if (picked != null && mounted) {
                    _uploadPhoto(File(picked.path));
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _uploadPhoto(File file) async {
    setState(() => _isUploadingPhoto = true);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.updatePassportPhoto(file);
    if (!mounted) return;
    setState(() => _isUploadingPhoto = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Passport photograph updated and synced successfully!'),
          backgroundColor: AppTheme.accent,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.errorMessage ?? 'Failed to update passport photo.'),
          backgroundColor: AppTheme.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final userProfile = authProvider.userProfile;
    final requestProvider = Provider.of<RequestProvider>(context);

    final completedJobs = requestProvider.providerJobs
        .where((j) => j.status == 'completed' || j.status == 'fully_completed')
        .toList();
    final totalEarned = completedJobs.fold<double>(0.0, (acc, j) => acc + (j.price ?? 0.0));

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Pro Hub 🛠️', style: Theme.of(context).textTheme.headlineMedium),
                      const SizedBox(height: 4),
                      Text('Business operations, earnings & professional dossier.', style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ),
                ),
                TextButton.icon(
                  onPressed: () => _confirmSignOut(context, authProvider),
                  icon: const Icon(LucideIcons.logOut, size: 16, color: AppTheme.error),
                  label: const Text('Sign Out', style: TextStyle(color: AppTheme.error, fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Hero Profile Dossier Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primary, Color(0xFF0F2557)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.2),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      // Interactive Passport Photo Avatar
                      Stack(
                        children: [
                          GestureDetector(
                            onTap: () => _showPhotoPickerSheet(context),
                            child: Container(
                              width: 68,
                              height: 68,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                                color: Colors.white.withValues(alpha: 0.2),
                              ),
                              child: ClipOval(
                                child: _isUploadingPhoto
                                    ? const Center(
                                        child: SizedBox(
                                          width: 24,
                                          height: 24,
                                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                                        ),
                                      )
                                    : (userProfile?.passportUrl != null && userProfile!.passportUrl!.isNotEmpty)
                                        ? SafeImageHelper.buildImage(
                                            userProfile.passportUrl,
                                            fit: BoxFit.cover,
                                            width: 68,
                                            height: 68,
                                            errorWidget: Center(
                                              child: Text(
                                                userProfile.fullName.isNotEmpty ? userProfile.fullName[0] : 'P',
                                                style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                                              ),
                                            ),
                                          )
                                        : Center(
                                            child: Text(
                                              userProfile?.fullName.isNotEmpty == true ? userProfile!.fullName[0] : 'P',
                                              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                                            ),
                                          ),
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: GestureDetector(
                              onTap: () => _showPhotoPickerSheet(context),
                              child: Container(
                                padding: const EdgeInsets.all(5),
                                decoration: const BoxDecoration(
                                  color: AppTheme.brandOrange,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
                                  ],
                                ),
                                child: const Icon(LucideIcons.camera, size: 12, color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    userProfile?.fullName ?? 'Service Specialist',
                                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                if (userProfile?.isVerified == true)
                                  const Icon(LucideIcons.badgeCheck, size: 18, color: Color(0xFF34D399)),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              userProfile?.email ?? '',
                              style: const TextStyle(color: Colors.white70, fontSize: 12),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                userProfile?.serviceCategory ?? 'Verified Artisan Specialist',
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // SECTION 1: BUSINESS & PERFORMANCE
            const Text(
              'BUSINESS & REVENUE',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textSecondary, letterSpacing: 0.8),
            ),
            const SizedBox(height: 10),

            // 1. Earnings & Payouts Card
            _buildActionCard(
              context,
              icon: LucideIcons.wallet,
              iconColor: const Color(0xFF047857),
              iconBgColor: const Color(0xFFECFDF5),
              title: 'Earnings & Settlements',
              subtitle: 'Track completed jobs, escrow releases & bank payouts',
              trailingText: '₦${totalEarned.toStringAsFixed(0)}',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ProviderEarningsScreen()),
                );
              },
            ),
            const SizedBox(height: 12),

            // 2. Ratings & Reviews Card
            _buildActionCard(
              context,
              icon: LucideIcons.star,
              iconColor: const Color(0xFFD97706),
              iconBgColor: const Color(0xFFFEF3C7),
              title: 'Ratings & Client Reviews',
              subtitle: '5-star breakdown and customer feedback ratings',
              trailingText: '${(userProfile?.rating ?? 4.9).toStringAsFixed(1)} ⭐',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ProviderRatingsScreen()),
                );
              },
            ),
            const SizedBox(height: 12),

            // 3. Craftsmanship Portfolio Card
            _buildActionCard(
              context,
              icon: LucideIcons.camera,
              iconColor: const Color(0xFF4F46E5),
              iconBgColor: const Color(0xFFEEF2FF),
              title: 'Craftsmanship & Portfolio',
              subtitle: 'Showcase proof-of-work photos and experience dossier',
              trailingText: '${userProfile?.jobPhotos.length ?? 0} photos',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ProviderPortfolioScreen()),
                );
              },
            ),
            const SizedBox(height: 24),

            // SECTION 2: COMPLIANCE & ACCOUNT
            const Text(
              'ACCOUNT & COMPLIANCE',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textSecondary, letterSpacing: 0.8),
            ),
            const SizedBox(height: 10),

            // 4. KYC Tile
            _buildActionCard(
              context,
              icon: userProfile?.isVerified == true
                  ? LucideIcons.badgeCheck
                  : userProfile?.isPendingReview == true
                      ? LucideIcons.clock
                      : LucideIcons.shieldAlert,
              iconColor: userProfile?.isVerified == true
                  ? const Color(0xFF047857)
                  : userProfile?.isPendingReview == true
                      ? const Color(0xFF1D4ED8)
                      : const Color(0xFFB45309),
              iconBgColor: userProfile?.isVerified == true
                  ? const Color(0xFFECFDF5)
                  : userProfile?.isPendingReview == true
                      ? const Color(0xFFEFF6FF)
                      : const Color(0xFFFFFBEB),
              title: 'Identity Verification (KYC)',
              subtitle: userProfile?.isVerified == true
                  ? 'Government ID & Passport Verified'
                  : userProfile?.isPendingReview == true
                      ? 'Documents under compliance review'
                      : 'Upload Government ID & Selfie to unlock jobs',
              trailingBadge: userProfile?.isVerified == true
                  ? 'VERIFIED'
                  : userProfile?.isPendingReview == true
                      ? 'IN REVIEW'
                      : 'ACTION REQ.',
              trailingBadgeColor: userProfile?.isVerified == true
                  ? const Color(0xFF047857)
                  : userProfile?.isPendingReview == true
                      ? const Color(0xFF1D4ED8)
                      : const Color(0xFFB45309),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => userProfile?.isPendingReview == true
                        ? const PendingApprovalScreen()
                        : const DocumentUploadScreen(),
                  ),
                );
              },
            ),
            const SizedBox(height: 12),

            // 5. Activity & Notifications Tile
            Consumer<NotificationProvider>(
              builder: (ctx, notifProvider, _) => _buildActionCard(
                ctx,
                icon: LucideIcons.bell,
                iconColor: AppTheme.primary,
                iconBgColor: AppTheme.primary.withValues(alpha: 0.1),
                title: 'Activity & Job Alerts',
                subtitle: 'Dispatches, work updates, and messages',
                trailingBadge: notifProvider.unreadCount > 0 ? '${notifProvider.unreadCount} NEW' : null,
                trailingBadgeColor: AppTheme.error,
                onTap: () {
                  Navigator.push(
                    ctx,
                    MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                  );
                },
              ),
            ),
            const SizedBox(height: 24),

            // Escrow Guarantee Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: const Row(
                children: [
                  Icon(LucideIcons.shieldCheck, color: Color(0xFF047857), size: 28),
                  SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Guaranteed Escrow Payouts 🔒',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF065F46)),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Clients fund jobs upfront. When you mark work complete, payments are guaranteed and released to your account.',
                          style: TextStyle(fontSize: 11.5, color: Color(0xFF047857), height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Sign Out Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () => authProvider.signOut(),
                icon: const Icon(LucideIcons.logOut, size: 18),
                label: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildActionCard(
    BuildContext context, {
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required String title,
    required String subtitle,
    String? trailingText,
    String? trailingBadge,
    Color? trailingBadgeColor,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        onTap: onTap,
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: iconBgColor,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 11.5, color: AppTheme.textSecondary), maxLines: 1, overflow: TextOverflow.ellipsis),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (trailingText != null)
              Text(
                trailingText,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primary),
              ),
            if (trailingBadge != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: (trailingBadgeColor ?? AppTheme.primary).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  trailingBadge,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: trailingBadgeColor ?? AppTheme.primary,
                  ),
                ),
              ),
            const SizedBox(width: 6),
            const Icon(LucideIcons.chevronRight, size: 18, color: AppTheme.textSecondary),
          ],
        ),
      ),
    );
  }
}

void _confirmSignOut(BuildContext context, AuthProvider authProvider) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Sign Out?'),
      content: const Text('Are you sure you want to sign out of your Wheelhomes account?'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () async {
            Navigator.pop(ctx);
            await authProvider.signOut();
          },
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
          child: const Text('Sign Out'),
        ),
      ],
    ),
  );
}
