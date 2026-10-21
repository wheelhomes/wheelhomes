import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/request_model.dart';
import '../../providers/request_provider.dart';
import '../chat/chat_screen.dart';

class ProviderMessagesTab extends StatefulWidget {
  const ProviderMessagesTab({super.key});

  @override
  State<ProviderMessagesTab> createState() => _ProviderMessagesTabState();
}

class _ProviderMessagesTabState extends State<ProviderMessagesTab> {
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final requestProvider = Provider.of<RequestProvider>(context);
    final myJobs = requestProvider.providerJobs;

    final filteredJobs = myJobs.where((j) {
      if (_searchQuery.trim().isEmpty) return true;
      final query = _searchQuery.toLowerCase();
      final title = j.serviceType.toLowerCase();
      final desc = j.description.toLowerCase();
      final address = (j.location['address'] ?? '').toString().toLowerCase();
      return title.contains(query) || desc.contains(query) || address.contains(query);
    }).toList();

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
                      Text('Messages 💬', style: Theme.of(context).textTheme.headlineMedium),
                      const SizedBox(height: 4),
                      Text('Direct client chat channels for your active jobs.', style: Theme.of(context).textTheme.bodyMedium),
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
                      const Icon(LucideIcons.messageSquare, size: 14, color: AppTheme.primary),
                      const SizedBox(width: 4),
                      Text(
                        '${myJobs.length} Channels',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.primary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Search Bar
            TextField(
              onChanged: (val) => setState(() => _searchQuery = val),
              decoration: InputDecoration(
                hintText: 'Search by client trade, location, or notes...',
                prefixIcon: const Icon(LucideIcons.search, size: 18),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppTheme.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppTheme.border),
                ),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
            const SizedBox(height: 16),

            // Conversation List or Empty State
            Expanded(
              child: filteredJobs.isEmpty
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
                            child: Icon(LucideIcons.messageSquare, size: 48, color: Colors.grey[400]),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _searchQuery.isNotEmpty
                                ? 'No discussions found matching "$_searchQuery".'
                                : 'No Client Messages Yet',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'When clients submit requests and you accept work, client chat channels sync here in real time with the web app.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      itemCount: filteredJobs.length,
                      itemBuilder: (context, index) {
                        final job = filteredJobs[index];
                        return _buildChatCard(context, job);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChatCard(BuildContext context, ServiceRequestModel job) {
    final isInProgress = job.status == 'in_progress';
    final isCompleted = job.status == 'completed' || job.status == 'fully_completed';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
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
        contentPadding: const EdgeInsets.all(14),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ChatScreen(
                jobId: job.id,
                title: job.serviceType,
                subtitle: job.location['address'] ?? 'Job Dispatch',
              ),
            ),
          );
        },
        leading: Stack(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
              child: Text(
                job.serviceType.isNotEmpty ? job.serviceType[0] : 'C',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primary),
              ),
            ),
            if (isInProgress)
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
          ],
        ),
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                job.serviceType,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: isInProgress
                    ? const Color(0xFFEFF6FF)
                    : isCompleted
                        ? const Color(0xFFECFDF5)
                        : const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                job.status.replaceAll('_', ' ').toUpperCase(),
                style: TextStyle(
                  fontSize: 9.5,
                  fontWeight: FontWeight.bold,
                  color: isInProgress
                      ? const Color(0xFF1D4ED8)
                      : isCompleted
                          ? const Color(0xFF047857)
                          : const Color(0xFFB45309),
                ),
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              job.description,
              style: const TextStyle(fontSize: 12.5, color: AppTheme.textSecondary),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (job.location['address'] != null && '${job.location['address']}'.isNotEmpty)
                  Expanded(
                    child: Row(
                      children: [
                        const Icon(LucideIcons.mapPin, size: 12, color: AppTheme.textSecondary),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            '${job.location['address']}',
                            style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(width: 8),
                Text(
                  job.price != null ? '₦${job.price!.toStringAsFixed(0)}' : 'Fee Pending',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.primary),
                ),
              ],
            ),
          ],
        ),
        trailing: const Icon(LucideIcons.chevronRight, size: 18, color: AppTheme.textSecondary),
      ),
    );
  }
}
