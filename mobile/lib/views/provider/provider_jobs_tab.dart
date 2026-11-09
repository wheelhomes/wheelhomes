import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/service_categories.dart';
import '../../models/request_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/request_provider.dart';
import '../../providers/service_provider_directory_provider.dart';
import '../chat/chat_screen.dart';
import '../notifications/notifications_screen.dart';

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

    final inProgressJobs = myJobs.where((j) => j.status == 'in_progress' || j.status == 'awaiting_confirmation' || j.status == 'partially_completed').toList();
    final acceptedJobs = myJobs.where((j) => j.status == 'pending' || j.status == 'accepted' || j.status == 'open' || j.status == 'assigned').toList();
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
                const SizedBox(width: 8),
                Consumer<NotificationProvider>(
                  builder: (context, notifProvider, _) {
                    final count = notifProvider.unreadCount;
                    return GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                        );
                      },
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.border),
                            ),
                            child: const Icon(LucideIcons.bell, size: 18, color: AppTheme.textPrimary),
                          ),
                          if (count > 0)
                            Positioned(
                              top: -4,
                              right: -4,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.error,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: Colors.white, width: 1.5),
                                ),
                                constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                                child: Text(
                                  count > 99 ? '99+' : '$count',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    );
                  },
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
    final isPending = job.status == 'pending' || job.status == 'open';
    final isInProgress = job.status == 'in_progress';
    final isAwaitingApproval = job.status == 'awaiting_confirmation' || job.status == 'partially_completed';
    final isCompleted = job.status == 'completed' || job.status == 'fully_completed';
    final isAccepted = job.status == 'accepted' || job.status == 'assigned';

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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      job.serviceType,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 3),
                    GestureDetector(
                      onTap: () {
                        Clipboard.setData(ClipboardData(text: job.displayRequestCode));
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Request ID #${job.displayRequestCode} copied!')),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3E8FF),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '#${job.displayRequestCode}',
                              style: const TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF6B21A8),
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Icon(LucideIcons.copy, size: 10, color: Color(0xFF6B21A8)),
                          ],
                        ),
                      ),
                    ),
                  ],
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
          if (job.assistantName != null && job.assistantName!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F3FF),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFDDD6FE)),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.userCheck, size: 15, color: Color(0xFF6D28D9)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Dispatched: ${job.assistantName}'
                      '${job.assistantPhone != null && job.assistantPhone!.isNotEmpty ? " • ${job.assistantPhone}" : ""}'
                      '${job.assistantArea != null && job.assistantArea!.isNotEmpty ? " (${job.assistantArea})" : ""}',
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF5B21B6),
                      ),
                    ),
                  ),
                ],
              ),
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
          if (isPending || isAccepted) ...[
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _handleDispatchAssistant(context, job, requestProvider),
                icon: const Icon(LucideIcons.userCheck, size: 15, color: Color(0xFF6D28D9)),
                label: Text(
                  job.assistantName != null && job.assistantName!.isNotEmpty
                      ? 'Change Assigned Assistant (${job.assistantName})'
                      : 'Dispatch Nearest Assistant (HOD)',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12.5,
                    color: Color(0xFF6D28D9),
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFC4B5FD)),
                  backgroundColor: const Color(0xFFF5F3FF),
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
          Row(
            children: [
              if (isPending) ...[
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      final authProv = Provider.of<AuthProvider>(context, listen: false);
                      final pId = authProv.user?.uid ?? job.providerId ?? '';
                      await requestProvider.acceptJob(jobId: job.id, providerId: pId);
                    },
                    icon: const Icon(LucideIcons.check, size: 15),
                    label: const Text('Accept Myself', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ] else if (isAccepted) ...[
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
                    label: const Text('Mark Work Done', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF047857),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ] else if (isAwaitingApproval) ...[
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEEF2FF),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFC7D2FE)),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.clock, size: 15, color: Color(0xFF4338CA)),
                        SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            'Awaiting Client Approval',
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11.5, color: Color(0xFF4338CA)),
                          ),
                        ),
                      ],
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
              if (!isPending)
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

  void _handleDispatchAssistant(
      BuildContext context, ServiceRequestModel job, RequestProvider reqProvider) async {
    final nameController = TextEditingController(text: job.assistantName ?? '');
    final phoneController = TextEditingController(text: job.assistantPhone ?? '');
    final areaController = TextEditingController(text: job.assistantArea ?? job.clientState ?? '');
    final noteController = TextEditingController();

    final authProv = Provider.of<AuthProvider>(context, listen: false);
    final dirProv = Provider.of<ServiceProviderDirectoryProvider>(context, listen: false);
    final hodUid = authProv.user?.uid ?? job.providerId ?? '';
    final targetCat = ServiceCategories.normalize(job.serviceType);
    final targetState = (job.clientState ?? '').trim().toLowerCase();

    // Include all non-HOD signed-up providers, sorted with same Department + State first
    final matchingSpecialists = dirProv.allVerifiedProviders.where((p) {
      if (p.uid == hodUid) return false;
      if (p.rawData['isHod'] == true) return false; // Exclude other appointed State HODs
      return true;
    }).toList()
      ..sort((a, b) {
        final aDept = ServiceCategories.normalize(a.serviceCategory) == targetCat ? 2 : 0;
        final bDept = ServiceCategories.normalize(b.serviceCategory) == targetCat ? 2 : 0;
        final aLoc = '${a.coverageArea ?? ''} ${a.address ?? ''} ${a.rawData['state'] ?? ''}'.toLowerCase();
        final bLoc = '${b.coverageArea ?? ''} ${b.address ?? ''} ${b.rawData['state'] ?? ''}'.toLowerCase();
        final aState = (targetState.isNotEmpty && aLoc.contains(targetState)) ? 1 : 0;
        final bState = (targetState.isNotEmpty && bLoc.contains(targetState)) ? 1 : 0;
        final scoreCmp = (bDept + bState).compareTo(aDept + aState);
        if (scoreCmp != 0) return scoreCmp;
        return a.fullName.compareTo(b.fullName);
      });
    String searchQuery = '';

    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Dispatch Nearest Assistant 🛠️',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
                        Text(
                          'Request ID: #${job.displayRequestCode} (Quote at Client Door)',
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF6B21A8),
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        icon: const Icon(LucideIcons.x, size: 20)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Search and select any signed-up provider (non-HOD) — ${job.serviceType} specialists in ${job.clientState ?? "your state"} are prioritized first — or enter a field assistant manually.',
                  style: const TextStyle(fontSize: 12.5, color: AppTheme.textSecondary),
                ),
                if (matchingSpecialists.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    'SIGNED-UP PROVIDERS & ROSTER (${matchingSpecialists.length})',
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF6D28D9),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    onChanged: (val) => setSheetState(() => searchQuery = val),
                    decoration: InputDecoration(
                      hintText: 'Search by name, trade/skill, or area...',
                      prefixIcon: const Icon(LucideIcons.search, size: 16),
                      isDense: true,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: matchingSpecialists.where((sp) {
                      final q = searchQuery.trim().toLowerCase();
                      if (q.isEmpty) return true;
                      return sp.fullName.toLowerCase().contains(q) ||
                          (sp.serviceCategory ?? '').toLowerCase().contains(q) ||
                          (sp.coverageArea ?? '').toLowerCase().contains(q);
                    }).map((sp) {
                      final isSelected = nameController.text.trim() == sp.fullName.trim();
                      final isSameDept = ServiceCategories.normalize(sp.serviceCategory) == targetCat;
                      return ActionChip(
                        avatar: Icon(
                          LucideIcons.userCheck,
                          size: 14,
                          color: isSelected ? Colors.white : const Color(0xFF6D28D9),
                        ),
                        backgroundColor: isSelected ? const Color(0xFF6D28D9) : const Color(0xFFF5F3FF),
                        side: BorderSide(
                          color: isSelected ? const Color(0xFF6D28D9) : const Color(0xFFDDD6FE),
                        ),
                        label: Text(
                          '${sp.fullName} • ${isSameDept ? "Dept Match" : (sp.serviceCategory ?? "Specialist")}${sp.coverageArea != null && sp.coverageArea!.isNotEmpty ? " (${sp.coverageArea})" : ""}',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : const Color(0xFF5B21B6),
                          ),
                        ),
                        onPressed: () {
                          setSheetState(() {
                            nameController.text = sp.fullName;
                            phoneController.text = sp.phone;
                            areaController.text = sp.coverageArea ?? job.clientState ?? '';
                          });
                        },
                      );
                    }).toList(),
                  ),
                ],
                const SizedBox(height: 14),
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Technician Full Name *',
                    prefixIcon: Icon(LucideIcons.userCheck, size: 18),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Technician Phone Number *',
                    prefixIcon: Icon(LucideIcons.phone, size: 18),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: areaController,
                  decoration: const InputDecoration(
                    labelText: 'Nearest Area / Zone (e.g. Ikeja, Lekki, Wuse)',
                    prefixIcon: Icon(LucideIcons.mapPin, size: 18),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: noteController,
                  decoration: const InputDecoration(
                    labelText: 'Arrival Note for Client (Optional)',
                    prefixIcon: Icon(LucideIcons.fileText, size: 18),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      if (nameController.text.trim().isEmpty ||
                          phoneController.text.trim().isEmpty) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          const SnackBar(
                            content: Text('Please enter the technician name and phone number.'),
                          ),
                        );
                        return;
                      }
                      Navigator.pop(ctx, true);
                    },
                    icon: const Icon(LucideIcons.userCheck, size: 18),
                    label: const Text('Dispatch Assistant to Client',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6D28D9)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    if (confirmed == true && context.mounted) {
      final authProv = Provider.of<AuthProvider>(context, listen: false);
      final hodUid = authProv.user?.uid ?? job.providerId ?? '';
      final hodName = authProv.userProfile?.fullName ?? 'Department HOD';
      final success = await reqProvider.dispatchAssistant(
        jobId: job.id,
        hodUid: hodUid,
        hodName: hodName,
        assistantName: nameController.text.trim(),
        assistantPhone: phoneController.text.trim(),
        assistantArea: areaController.text.trim(),
        note: noteController.text.trim(),
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success
                ? 'Technician ${nameController.text.trim()} dispatched! Client notified.'
                : 'Failed to dispatch assistant.'),
            backgroundColor: success ? const Color(0xFF6D28D9) : AppTheme.error,
          ),
        );
      }
    }
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
    final feeController = TextEditingController(
      text: job.price != null ? job.price!.toStringAsFixed(0) : '',
    );
    final summaryController = TextEditingController(
      text: job.completionSummary ?? '',
    );

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
                const Text(
                  'Submit Work & Final Bill 🛠️',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  icon: const Icon(LucideIcons.x, size: 20),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Confirm the final agreed fee (keep the initial budget or update if parts/extra work were agreed upon with the client) and summarize what was fixed.',
              style: const TextStyle(fontSize: 12.5, color: AppTheme.textSecondary, height: 1.35),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: feeController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Final Agreed Fee (₦) *',
                helperText: job.price != null
                    ? 'Client initial estimate: ₦${job.price!.toStringAsFixed(0)}'
                    : 'Enter total agreed fee in Naira',
                prefixIcon: const Icon(LucideIcons.banknote, size: 18),
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: summaryController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Work Done / Parts Replaced Summary *',
                hintText: 'e.g. Replaced capacitor, topped up gas, and tested cooling.',
                prefixIcon: Icon(LucideIcons.clipboardCheck, size: 18),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () {
                  final parsedFee = double.tryParse(feeController.text.replaceAll(',', '').trim());
                  if (parsedFee == null || parsedFee <= 0) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      const SnackBar(content: Text('Please enter a valid Final Agreed Fee (₦).')),
                    );
                    return;
                  }
                  if (summaryController.text.trim().isEmpty) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      const SnackBar(content: Text('Please enter a brief summary of the completed work.')),
                    );
                    return;
                  }
                  Navigator.pop(ctx, true);
                },
                icon: const Icon(LucideIcons.checkCircle2, size: 18),
                label: const Text(
                  'Submit for Client Approval',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF047857)),
              ),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true && context.mounted) {
      final parsedFee = double.tryParse(feeController.text.replaceAll(',', '').trim());
      final success = await reqProvider.updateJobStatus(
        jobId: job.id,
        status: 'awaiting_confirmation',
        finalPrice: parsedFee,
        completionSummary: summaryController.text.trim(),
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success
                ? 'Work & final bill submitted! Waiting for client approval. 🛠️'
                : 'Failed to update job status.'),
            backgroundColor: success ? const Color(0xFF047857) : AppTheme.error,
          ),
        );
      }
    }
  }
}
