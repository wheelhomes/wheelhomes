import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/request_model.dart';
import '../../providers/request_provider.dart';
import '../chat/chat_screen.dart';

class ProviderMyJobsTab extends StatefulWidget {
  final VoidCallback onBrowseMarket;

  const ProviderMyJobsTab({super.key, required this.onBrowseMarket});

  @override
  State<ProviderMyJobsTab> createState() => _ProviderMyJobsTabState();
}

class _ProviderMyJobsTabState extends State<ProviderMyJobsTab> {
  String _selectedFilter = 'All'; // 'All', 'In Progress', 'Accepted', 'Completed'

  @override
  Widget build(BuildContext context) {
    final requestProvider = Provider.of<RequestProvider>(context);
    final myJobs = requestProvider.providerJobs;

    final inProgressJobs = myJobs.where((j) => j.status == 'in_progress').toList();
    final acceptedJobs = myJobs.where((j) => j.status == 'accepted' || j.status == 'open' || j.status == 'assigned').toList();
    final completedJobs = myJobs.where((j) => j.status == 'completed' || j.status == 'fully_completed').toList();

    List<ServiceRequestModel> displayedJobs;
    switch (_selectedFilter) {
      case 'In Progress':
        displayedJobs = inProgressJobs;
        break;
      case 'Accepted':
        displayedJobs = acceptedJobs;
        break;
      case 'Completed':
        displayedJobs = completedJobs;
        break;
      case 'All':
      default:
        displayedJobs = myJobs;
        break;
    }

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('My Jobs 📋', style: Theme.of(context).textTheme.headlineMedium),
                      const SizedBox(height: 4),
                      Text('Active client projects & status management.', style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(LucideIcons.activity, size: 14, color: AppTheme.primary),
                      const SizedBox(width: 4),
                      Text(
                        '${inProgressJobs.length} Active',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.primary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Filter Tabs
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('All', myJobs.length),
                  const SizedBox(width: 8),
                  _buildFilterChip('In Progress', inProgressJobs.length),
                  const SizedBox(width: 8),
                  _buildFilterChip('Accepted', acceptedJobs.length),
                  const SizedBox(width: 8),
                  _buildFilterChip('Completed', completedJobs.length),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Job List or Empty State
            Expanded(
              child: displayedJobs.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Colors.grey[100],
                              shape: BoxShape.circle,
                            ),
                            child: Icon(LucideIcons.clipboardList, size: 48, color: Colors.grey[400]),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _selectedFilter == 'All'
                                ? 'No assigned jobs yet.'
                                : 'No $_selectedFilter jobs found.',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Browse incoming customer requests in the Market to accept new work.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: widget.onBrowseMarket,
                            icon: const Icon(LucideIcons.store, size: 16),
                            label: const Text('Browse Market'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      itemCount: displayedJobs.length,
                      itemBuilder: (context, index) {
                        final job = displayedJobs[index];
                        return _buildJobCard(context, job, requestProvider);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, int count) {
    final isSelected = _selectedFilter == label;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = label),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? AppTheme.primary : AppTheme.border),
          boxShadow: isSelected
              ? [BoxShadow(color: AppTheme.primary.withValues(alpha: 0.2), blurRadius: 4, offset: const Offset(0, 2))]
              : null,
        ),
        child: Row(
          children: [
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : AppTheme.textPrimary,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                fontSize: 12,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
              decoration: BoxDecoration(
                color: isSelected ? Colors.white.withValues(alpha: 0.25) : Colors.grey[200],
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  color: isSelected ? Colors.white : AppTheme.textSecondary,
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildJobCard(BuildContext context, ServiceRequestModel job, RequestProvider requestProvider) {
    final isInProgress = job.status == 'in_progress';
    final isCompleted = job.status == 'completed' || job.status == 'fully_completed';
    final isAccepted = job.status == 'accepted' || job.status == 'open' || job.status == 'assigned';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isInProgress ? AppTheme.primary.withValues(alpha: 0.5) : AppTheme.border,
          width: isInProgress ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
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
                  color: isInProgress
                      ? const Color(0xFFEFF6FF)
                      : isCompleted
                          ? const Color(0xFFECFDF5)
                          : const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isInProgress
                          ? LucideIcons.refreshCw
                          : isCompleted
                              ? LucideIcons.checkCircle2
                              : LucideIcons.clock,
                      size: 11,
                      color: isInProgress
                          ? const Color(0xFF1D4ED8)
                          : isCompleted
                              ? const Color(0xFF047857)
                              : const Color(0xFFB45309),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      job.status.replaceAll('_', ' ').toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isInProgress
                            ? const Color(0xFF1D4ED8)
                            : isCompleted
                                ? const Color(0xFF047857)
                                : const Color(0xFFB45309),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            job.description,
            style: const TextStyle(color: AppTheme.textPrimary, height: 1.35, fontSize: 13),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
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
          const SizedBox(height: 12),
          // Price & Escrow Tag
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.border.withValues(alpha: 0.6)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Agreed Fee', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                    Text(
                      job.price != null ? '₦${job.price!.toStringAsFixed(0)}' : 'To Negotiate',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.primary),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: job.paymentStatus == 'released'
                        ? const Color(0xFFECFDF5)
                        : const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        job.paymentStatus == 'released' ? LucideIcons.checkCheck : LucideIcons.shieldCheck,
                        size: 13,
                        color: job.paymentStatus == 'released' ? const Color(0xFF047857) : const Color(0xFF1D4ED8),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        job.paymentStatus == 'released' ? 'Settled to Bank ✅' : 'Escrow Secured 🔒',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: job.paymentStatus == 'released' ? const Color(0xFF047857) : const Color(0xFF1D4ED8),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: AppTheme.border),
          const SizedBox(height: 10),
          // Action Buttons Row
          Row(
            children: [
              if (isAccepted) ...[
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _handleStartJob(context, job, requestProvider),
                    icon: const Icon(LucideIcons.playCircle, size: 15),
                    label: const Text('Start Work', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ] else if (isInProgress) ...[
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _handleCompleteJob(context, job, requestProvider),
                    icon: const Icon(LucideIcons.checkCircle2, size: 15),
                    label: const Text('Complete Job', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF047857),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ] else if (isCompleted) ...[
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.checkCircle2, size: 15, color: Color(0xFF047857)),
                        SizedBox(width: 6),
                        Text(
                          'Work Completed 🎉',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF047857)),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              OutlinedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ChatScreen(
                        title: job.serviceType,
                        subtitle: job.location['address'] ?? 'Job Dispatch',
                        jobId: job.id,
                      ),
                    ),
                  );
                },
                icon: const Icon(LucideIcons.messageSquare, size: 15),
                label: const Text('Chat', style: TextStyle(fontSize: 13)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.primary,
                  side: const BorderSide(color: AppTheme.border),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _handleStartJob(BuildContext context, ServiceRequestModel job, RequestProvider reqProvider) async {
    final etaController = TextEditingController();
    final noteController = TextEditingController();

    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          left: 20,
          right: 20,
          top: 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Start Working on Job 🚀', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                IconButton(onPressed: () => Navigator.pop(ctx, false), icon: const Icon(LucideIcons.x, size: 20)),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Notify the client that work on "${job.serviceType}" is beginning.',
              style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: etaController,
              decoration: const InputDecoration(
                labelText: 'Estimated Completion (e.g. 2 hours, Today 5 PM)',
                prefixIcon: Icon(LucideIcons.clock, size: 18),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: noteController,
              decoration: const InputDecoration(
                labelText: 'Specialist Note / Tools Prepared (Optional)',
                prefixIcon: Icon(LucideIcons.fileText, size: 18),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () => Navigator.pop(ctx, true),
                icon: const Icon(LucideIcons.playCircle, size: 18),
                label: const Text('Confirm & Begin Work', style: TextStyle(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
              ),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true && context.mounted) {
      final success = await reqProvider.updateJobStatus(
        jobId: job.id,
        status: 'in_progress',
        eta: etaController.text.trim().isNotEmpty ? etaController.text.trim() : null,
        note: noteController.text.trim().isNotEmpty ? noteController.text.trim() : null,
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success ? 'Job started! Client notified in real-time. 🚀' : 'Failed to start job. Please try again.'),
            backgroundColor: success ? AppTheme.primary : AppTheme.error,
          ),
        );
      }
    }
  }

  void _handleCompleteJob(BuildContext context, ServiceRequestModel job, RequestProvider reqProvider) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Mark Job as Completed? 🎉'),
        content: Text(
          'Confirm that your work on "${job.serviceType}" is fully complete. The client will be notified immediately to inspect the service and release your escrow payout.',
          style: const TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF047857)),
            child: const Text('Confirm Completion', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      final success = await reqProvider.updateJobStatus(
        jobId: job.id,
        status: 'fully_completed',
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success ? 'Job marked completed! Escrow release request dispatched to client. 🎉' : 'Failed to update job status.'),
            backgroundColor: success ? const Color(0xFF047857) : AppTheme.error,
          ),
        );
      }
    }
  }
}
