import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/request_provider.dart';

class ProviderRatingsScreen extends StatelessWidget {
  const ProviderRatingsScreen({super.key});

  String _formatDate(String? isoString) {
    if (isoString == null || isoString.isEmpty) return 'Recent';
    try {
      final dt = DateTime.parse(isoString);
      final diff = DateTime.now().difference(dt);
      if (diff.inDays == 0) return 'Today';
      if (diff.inDays == 1) return 'Yesterday';
      if (diff.inDays < 7) return '${diff.inDays} days ago';
      return DateFormat('MMM d, yyyy').format(dt);
    } catch (_) {
      return 'Recent';
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final userProfile = authProvider.userProfile;
    final requestProvider = Provider.of<RequestProvider>(context);

    // Extract real reviews from completed jobs
    final completedJobsWithReviews = requestProvider.providerJobs
        .where((j) => (j.status == 'completed' || j.status == 'fully_completed') && j.clientReview != null && j.clientReview!.isNotEmpty)
        .toList();

    final totalReviewCount = completedJobsWithReviews.length;
    final avgRating = totalReviewCount > 0
        ? (completedJobsWithReviews.fold<double>(0.0, (acc, j) => acc + (j.clientRating ?? 5.0)) / totalReviewCount)
        : (userProfile?.rating ?? 5.0);

    // Dynamic star breakdown
    final count5 = completedJobsWithReviews.where((j) => (j.clientRating ?? 5.0) >= 4.75).length;
    final count4 = completedJobsWithReviews.where((j) => (j.clientRating ?? 5.0) >= 3.75 && (j.clientRating ?? 5.0) < 4.75).length;
    final count3 = completedJobsWithReviews.where((j) => (j.clientRating ?? 5.0) >= 2.75 && (j.clientRating ?? 5.0) < 3.75).length;
    final count2 = completedJobsWithReviews.where((j) => (j.clientRating ?? 5.0) >= 1.75 && (j.clientRating ?? 5.0) < 2.75).length;
    final count1 = completedJobsWithReviews.where((j) => (j.clientRating ?? 5.0) < 1.75).length;

    final pct5 = totalReviewCount > 0 ? (count5 / totalReviewCount) : (totalReviewCount == 0 ? 1.0 : 0.0);
    final pct4 = totalReviewCount > 0 ? (count4 / totalReviewCount) : 0.0;
    final pct3 = totalReviewCount > 0 ? (count3 / totalReviewCount) : 0.0;
    final pct2 = totalReviewCount > 0 ? (count2 / totalReviewCount) : 0.0;
    final pct1 = totalReviewCount > 0 ? (count1 / totalReviewCount) : 0.0;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Ratings & Reviews'),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textPrimary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Rating Summary Hero Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.border),
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
                  Row(
                    children: [
                      // Score Column
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                avgRating.toStringAsFixed(1),
                                style: const TextStyle(
                                  fontSize: 44,
                                  fontWeight: FontWeight.w900,
                                  color: AppTheme.textPrimary,
                                  letterSpacing: -1,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(LucideIcons.star, color: Color(0xFFFBBF24), size: 32),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            totalReviewCount > 0
                                ? 'From $totalReviewCount verified clients'
                                : 'Overall Client Score',
                            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0xFFA7F3D0)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(LucideIcons.award, size: 12, color: Color(0xFF059669)),
                                SizedBox(width: 4),
                                Text(
                                  'Top Rated Pro',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF047857)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 20),
                      const VerticalDivider(width: 1, thickness: 1),
                      const SizedBox(width: 12),

                      // Breakdown Bars
                      Expanded(
                        child: Column(
                          children: [
                            _buildRatingBar(5, pct5, '${(pct5 * 100).round()}%'),
                            _buildRatingBar(4, pct4, '${(pct4 * 100).round()}%'),
                            _buildRatingBar(3, pct3, '${(pct3 * 100).round()}%'),
                            _buildRatingBar(2, pct2, '${(pct2 * 100).round()}%'),
                            _buildRatingBar(1, pct1, '${(pct1 * 100).round()}%'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Review List Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Verified Client Feedback',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                ),
                Text(
                  '$totalReviewCount reviews',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                ),
              ],
            ),
            const SizedBox(height: 12),

            if (completedJobsWithReviews.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Column(
                  children: [
                    Icon(LucideIcons.messageSquare, size: 40, color: Colors.grey[300]),
                    const SizedBox(height: 12),
                    const Text(
                      'No Client Reviews Yet',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textPrimary),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Complete your accepted jobs to earn verified ratings and client testimonials.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: completedJobsWithReviews.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final job = completedJobsWithReviews[index];
                  final clientName = job.clientName ?? 'Verified Client';
                  final ratingValue = (job.clientRating ?? 5.0).round();
                  final dateText = _formatDate(job.actualEndTime ?? job.createdAt);

                  return Container(
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
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 16,
                                  backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                                  child: Text(
                                    clientName.isNotEmpty ? clientName[0].toUpperCase() : 'C',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primary),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      clientName,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                    Text(
                                      dateText,
                                      style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            Row(
                              children: List.generate(
                                5,
                                (i) => Icon(
                                  LucideIcons.star,
                                  size: 14,
                                  color: i < ratingValue ? const Color(0xFFFBBF24) : Colors.grey[300],
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.background,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            job.serviceType,
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          job.clientReview ?? '',
                          style: const TextStyle(fontSize: 12.5, height: 1.4, color: AppTheme.textPrimary),
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildRatingBar(int stars, double pct, String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Text('$stars', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textSecondary)),
          const SizedBox(width: 4),
          const Icon(LucideIcons.star, size: 9, color: Color(0xFFFBBF24)),
          const SizedBox(width: 6),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: pct.clamp(0.0, 1.0),
                backgroundColor: const Color(0xFFF1F5F9),
                valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFFBBF24)),
                minHeight: 5,
              ),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 28,
            child: Text(label, style: const TextStyle(fontSize: 9, color: AppTheme.textSecondary)),
          ),
        ],
      ),
    );
  }
}
