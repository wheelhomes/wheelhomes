import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/request_provider.dart';
import '../verification/document_upload_screen.dart';
import '../verification/pending_approval_screen.dart';

class ProviderMarketTab extends StatefulWidget {
  final VoidCallback onViewJobInMyJobs;

  const ProviderMarketTab({super.key, required this.onViewJobInMyJobs});

  @override
  State<ProviderMarketTab> createState() => _ProviderMarketTabState();
}

class _ProviderMarketTabState extends State<ProviderMarketTab> {
  String _selectedTrade = 'All';

  // 13 Canonical Service Categories matching Web & Registration 1:1
  static const List<String> _tradeCategories = [
    'All',
    'General Maintenance',
    'Plumbing & Pipefitting',
    'Electrical & Wiring',
    'Carpentry & Woodwork',
    'Painting & Wall Finishes',
    'HVAC & AC Repair',
    'Masonry, Tiling & Flooring',
    'Roofing & Ceiling',
    'Cleaning & Fumigation',
    'Welding & Metal Fabrication',
    'Landscaping & Gardening',
    'Appliance Repair',
    'Solar & Inverter Systems',
  ];

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;
    final userProfile = authProvider.userProfile;
    final requestProvider = Provider.of<RequestProvider>(context);

    final openJobs = requestProvider.openMarketJobs;

    final filteredOpenJobs = openJobs.where((j) {
      if (_selectedTrade == 'All') return true;
      final query = _selectedTrade.toLowerCase();
      return j.serviceType.toLowerCase().contains(query) ||
          query.contains(j.serviceType.toLowerCase());
    }).toList();

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title & Subtitle
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Job Market 💼', style: Theme.of(context).textTheme.headlineMedium),
                      const SizedBox(height: 4),
                      Text('Find and claim open client service dispatches.', style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${openJobs.length} Available',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.accent),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Verification Warning if Not Approved
            if (userProfile != null && !userProfile.isVerified) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: userProfile.isRejected
                      ? const Color(0xFFFEF2F2)
                      : userProfile.isPendingReview
                          ? const Color(0xFFEFF6FF)
                          : const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: userProfile.isRejected
                        ? const Color(0xFFFECACA)
                        : userProfile.isPendingReview
                            ? const Color(0xFFBFDBFE)
                            : const Color(0xFFFDE68A),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      userProfile.isRejected
                          ? LucideIcons.alertTriangle
                          : userProfile.isPendingReview
                              ? LucideIcons.clock
                              : LucideIcons.shieldAlert,
                      color: userProfile.isRejected
                          ? const Color(0xFFDC2626)
                          : userProfile.isPendingReview
                              ? const Color(0xFF1D4ED8)
                              : const Color(0xFFB45309),
                      size: 20,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        userProfile.isRejected
                            ? 'Verification update needed to accept jobs.'
                            : userProfile.isPendingReview
                                ? 'KYC In Review: You will be able to claim jobs once approved.'
                                : 'Complete identity verification to claim client jobs.',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: userProfile.isRejected
                              ? const Color(0xFF991B1B)
                              : userProfile.isPendingReview
                                  ? const Color(0xFF1E40AF)
                                  : const Color(0xFF92400E),
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => userProfile.isPendingReview
                                ? const PendingApprovalScreen()
                                : const DocumentUploadScreen(),
                          ),
                        );
                      },
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        visualDensity: VisualDensity.compact,
                      ),
                      child: Text(
                        userProfile.isPendingReview ? 'Status' : 'Verify',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
            ],

            // 13 Trade Category Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _tradeCategories.map((trade) {
                  final isSel = _selectedTrade == trade;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6.0),
                    child: FilterChip(
                      selected: isSel,
                      label: Text(trade),
                      labelStyle: TextStyle(
                        color: isSel ? Colors.white : AppTheme.textPrimary,
                        fontSize: 11.5,
                        fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                      ),
                      selectedColor: AppTheme.primary,
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: isSel ? AppTheme.primary : AppTheme.border),
                      ),
                      onSelected: (_) => setState(() => _selectedTrade = trade),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 14),

            // Open Jobs List
            Expanded(
              child: filteredOpenJobs.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.store, size: 44, color: Colors.grey[400]),
                          const SizedBox(height: 12),
                          Text(
                            _selectedTrade == 'All'
                                ? 'No open jobs in the market right now.'
                                : 'No jobs found for "$_selectedTrade".',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Incoming client requests across Nigeria will appear here in real time.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      itemCount: filteredOpenJobs.length,
                      itemBuilder: (context, index) {
                        final job = filteredOpenJobs[index];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.border),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.02),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      job.serviceType,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppTheme.accent.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'OPEN MARKET',
                                      style: TextStyle(color: AppTheme.accent, fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                job.description,
                                style: const TextStyle(color: AppTheme.textPrimary, height: 1.35, fontSize: 13),
                              ),
                              if (job.location['address'] != null && '${job.location['address']}'.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    const Icon(LucideIcons.mapPin, size: 14, color: AppTheme.textSecondary),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        '${job.location['address']}',
                                        style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                              if (job.images.isNotEmpty) ...[
                                const SizedBox(height: 10),
                                SizedBox(
                                  height: 56,
                                  child: ListView.builder(
                                    scrollDirection: Axis.horizontal,
                                    itemCount: job.images.length,
                                    itemBuilder: (context, i) => Container(
                                      width: 56,
                                      height: 56,
                                      margin: const EdgeInsets.only(right: 8),
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: AppTheme.border),
                                      ),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: Image.network(job.images[i], fit: BoxFit.cover),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                              const SizedBox(height: 12),
                              const Divider(height: 1, color: AppTheme.border),
                              const SizedBox(height: 10),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Client Budget:', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                                      Text(
                                        job.price != null ? '₦${job.price!.toStringAsFixed(0)}' : 'To Negotiate',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.primary),
                                      ),
                                    ],
                                  ),
                                  ElevatedButton.icon(
                                    onPressed: requestProvider.isSubmitting
                                        ? null
                                        : () async {
                                            if (user == null) return;
                                            final profile = Provider.of<AuthProvider>(context, listen: false).userProfile;
                                            if (profile == null || !profile.isVerified || profile.status != 'approved') {
                                              _showGatingSheet(context);
                                              return;
                                            }
                                            final messenger = ScaffoldMessenger.of(context);
                                            final confirmed = await showDialog<bool>(
                                              context: context,
                                              builder: (ctx) => AlertDialog(
                                                title: const Text('Accept Job Dispatch?'),
                                                content: Text('Are you sure you want to accept this ${job.serviceType} job? You will be assigned as the provider.'),
                                                actions: [
                                                  TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                                                  ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Accept Job')),
                                                ],
                                              ),
                                            );

                                            if (confirmed != true) return;
                                            if (!context.mounted) return;

                                            final success = await requestProvider.acceptJob(
                                              jobId: job.id,
                                              providerId: user.uid,
                                            );
                                            if (!context.mounted) return;

                                            if (success) {
                                              messenger.showSnackBar(
                                                const SnackBar(
                                                  content: Text('Job accepted successfully! Switched to My Jobs. 🎉'),
                                                  backgroundColor: AppTheme.accent,
                                                ),
                                              );
                                              widget.onViewJobInMyJobs();
                                            }
                                          },
                                    icon: Icon(
                                      (userProfile?.isVerified == true) ? LucideIcons.checkCircle2 : LucideIcons.lock,
                                      size: 16,
                                    ),
                                    label: Text((userProfile?.isVerified == true) ? 'Accept Job' : 'Verify to Accept'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: (userProfile?.isVerified == true) ? AppTheme.primary : const Color(0xFF64748B),
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  void _showGatingSheet(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final userProfile = authProvider.userProfile;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: const Icon(LucideIcons.shieldAlert, color: Color(0xFFB45309), size: 40),
              ),
              const SizedBox(height: 16),
              const Text(
                'Identity Verification Required',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'To protect homeowners and release escrow payments safely, service providers must submit their Government ID and Passport photograph before accepting customer jobs.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => userProfile?.isPendingReview == true
                            ? const PendingApprovalScreen()
                            : const DocumentUploadScreen(),
                      ),
                    );
                  },
                  icon: const Icon(LucideIcons.uploadCloud, size: 18),
                  label: const Text('Upload Verification Documents'),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Not Now, Continue Browsing', style: TextStyle(color: AppTheme.textSecondary)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
