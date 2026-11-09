import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/request_provider.dart';
import '../../providers/service_provider_directory_provider.dart';
import '../verification/document_upload_screen.dart';
import '../verification/pending_approval_screen.dart';

class ProviderMarketTab extends StatefulWidget {
  final VoidCallback onViewJobInMyJobs;

  const ProviderMarketTab({super.key, required this.onViewJobInMyJobs});

  @override
  State<ProviderMarketTab> createState() => _ProviderMarketTabState();
}

class _ProviderMarketTabState extends State<ProviderMarketTab> {
  @override
  Widget build(BuildContext context) {
    Provider.of<ServiceProviderDirectoryProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final userProfile = authProvider.userProfile;
    final requestProvider = Provider.of<RequestProvider>(context);

    final assignedJobs = requestProvider.providerAssignedJobs;
    final pendingDispatchJobs = assignedJobs
        .where((j) => j.status == 'pending' || j.status == 'open' || j.status == 'accepted' || j.status == 'assigned')
        .toList();

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
                      Text('HOD Dispatch Hub 🛡️', style: Theme.of(context).textTheme.headlineMedium),
                      const SizedBox(height: 4),
                      Text(
                        'Direct State + Category HOD routing & assistant dispatch.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF2FF),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${pendingDispatchJobs.length} Active',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF4338CA)),
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
                            ? 'Verification update needed to receive HOD dispatches.'
                            : userProfile.isPendingReview
                                ? 'KYC In Review: You will receive department dispatches once approved.'
                                : 'Complete identity verification to receive department dispatches.',
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

            // Smart Routing Rule Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF312E81), Color(0xFF1E1B4B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(LucideIcons.shieldCheck, color: Color(0xFFA5B4FC), size: 18),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '1 Request = 1 Category + 1 Location = 1 HOD',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Client requests are no longer broadcast to an open market. Each request routes directly to the designated Head of Department (HOD) for that service in the client\'s State, who then dispatches the nearest Field Assistant.',
                    style: TextStyle(
                      color: Color(0xFFE0E7FF),
                      fontSize: 11.5,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Department Dispatches List
            Expanded(
              child: pendingDispatchJobs.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.shield, size: 44, color: Colors.grey[400]),
                          const SizedBox(height: 12),
                          const Text(
                            'No Pending Department Dispatches',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'When a client in your State requests your service category (or your HOD dispatches you), the job will appear immediately in your My Jobs inbox.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.35),
                          ),
                          const SizedBox(height: 16),
                          OutlinedButton.icon(
                            onPressed: widget.onViewJobInMyJobs,
                            icon: const Icon(LucideIcons.briefcase, size: 16),
                            label: const Text('Go to My Jobs & Dispatch'),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      itemCount: pendingDispatchJobs.length,
                      itemBuilder: (context, index) {
                        final job = pendingDispatchJobs[index];
                        final hasAssistant = job.assistantName != null && job.assistantName!.isNotEmpty;
                        return Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.border),
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
                                      color: const Color(0xFFEEF2FF),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      job.clientState != null ? '${job.clientState} HOD' : 'HOD DISPATCH',
                                      style: const TextStyle(
                                        color: Color(0xFF4338CA),
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
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
                              if (hasAssistant) ...[
                                const SizedBox(height: 10),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFECFDF5),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xFFA7F3D0)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(LucideIcons.users, size: 14, color: Color(0xFF047857)),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          'Assistant Dispatched: ${job.assistantName}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF065F46),
                                          ),
                                        ),
                                      ),
                                    ],
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
                                        job.price != null ? '₦${job.price!.toStringAsFixed(0)}' : 'Standard Rate',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.primary),
                                      ),
                                    ],
                                  ),
                                  ElevatedButton.icon(
                                    onPressed: widget.onViewJobInMyJobs,
                                    icon: const Icon(LucideIcons.users, size: 15),
                                    label: Text(hasAssistant ? 'Manage in My Jobs' : 'Dispatch Assistant'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF4F46E5),
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
}
