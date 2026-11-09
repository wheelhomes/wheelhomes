import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme.dart';
import '../../core/service_categories.dart';
import '../../models/user_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/service_provider_directory_provider.dart';
import '../requests/create_request_screen.dart';
import '../chat/chat_screen.dart';

class VerifiedProvidersScreen extends StatefulWidget {
  final String? initialCategory;

  const VerifiedProvidersScreen({super.key, this.initialCategory});

  @override
  State<VerifiedProvidersScreen> createState() => _VerifiedProvidersScreenState();
}

class _VerifiedProvidersScreenState extends State<VerifiedProvidersScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final provider = Provider.of<ServiceProviderDirectoryProvider>(context, listen: false);
      if (widget.initialCategory != null && widget.initialCategory!.trim().isNotEmpty) {
        provider.setSearchQuery('');
        provider.setSelectedCategory(ServiceCategories.normalize(widget.initialCategory));
      } else {
        provider.resetFilters();
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Color _getCategoryColor(String? category) => ServiceCategories.getColor(category);
  IconData _getCategoryIcon(String? category) => ServiceCategories.getIcon(category);

  void _showProviderDetails(BuildContext context, UserProfile provider) {
    final authUser = Provider.of<AuthProvider>(context, listen: false).user;
    final catColor = _getCategoryColor(provider.serviceCategory);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          children: [
            // Handle bar
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 30),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Provider Header
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Avatar
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Container(
                              width: 72,
                              height: 72,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: catColor.withValues(alpha: 0.12),
                                border: Border.all(color: catColor.withValues(alpha: 0.3), width: 2),
                              ),
                              child: Center(
                                child: Text(
                                  provider.fullName.isNotEmpty ? provider.fullName[0].toUpperCase() : 'P',
                                  style: TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.bold,
                                    color: catColor,
                                  ),
                                ),
                              ),
                            ),
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: Color(0xFF047857),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(LucideIcons.check, size: 12, color: Colors.white),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                provider.fullName,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                              if (provider.businessName != null && provider.businessName!.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  provider.businessName!,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: provider.rawData['isHod'] == true
                                      ? const Color(0xFFF5F3FF)
                                      : const Color(0xFFF0FDF4),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: provider.rawData['isHod'] == true
                                        ? const Color(0xFFDDD6FE)
                                        : const Color(0xFFBBF7D0),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      provider.rawData['isHod'] == true ? LucideIcons.crown : LucideIcons.shieldCheck,
                                      size: 14,
                                      color: provider.rawData['isHod'] == true
                                          ? const Color(0xFF7C3AED)
                                          : const Color(0xFF047857),
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      provider.rawData['isHod'] == true ? 'Appointed State HOD' : 'Verified & Vetted Pro',
                                      style: TextStyle(
                                        color: provider.rawData['isHod'] == true
                                            ? const Color(0xFF7C3AED)
                                            : const Color(0xFF047857),
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // Quick Stats Cards
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppTheme.border),
                            ),
                            child: Column(
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(LucideIcons.star, size: 16, color: Color(0xFFF59E0B)),
                                    const SizedBox(width: 4),
                                    Text(
                                      provider.rating.toStringAsFixed(1),
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${provider.reviewCount} Reviews',
                                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppTheme.border),
                            ),
                            child: Column(
                              children: [
                                const Icon(LucideIcons.briefcase, size: 16, color: AppTheme.primary),
                                const SizedBox(height: 2),
                                Text(
                                  provider.experience != null && provider.experience!.isNotEmpty
                                      ? '${provider.experience} Exp'
                                      : 'Certified',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const Text(
                                  'Experience',
                                  style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppTheme.border),
                            ),
                            child: Column(
                              children: [
                                const Icon(LucideIcons.shield, size: 16, color: Color(0xFF047857)),
                                const SizedBox(height: 2),
                                const Text(
                                  '100%',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF047857)),
                                ),
                                const Text(
                                  'KYC Approved',
                                  style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 22),

                    // Primary Service Category
                    const Text(
                      'Specialization',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: catColor.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: catColor.withValues(alpha: 0.2)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(_getCategoryIcon(provider.serviceCategory), size: 18, color: catColor),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              provider.serviceCategory ?? 'Skilled Trade Specialist',
                              style: TextStyle(fontWeight: FontWeight.bold, color: catColor, fontSize: 14),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Coverage Area
                    const Text(
                      'Service Coverage Area',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(LucideIcons.mapPin, size: 16, color: AppTheme.textSecondary),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            provider.coverageArea != null && provider.coverageArea!.isNotEmpty
                                ? provider.coverageArea!
                                : 'Available for callouts across the metropolis',
                            style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary),
                          ),
                        ),
                      ],
                    ),

                    // Bio
                    if (provider.bio != null && provider.bio!.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      const Text(
                        'About Specialist',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        provider.bio!,
                        style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary, height: 1.5),
                      ),
                    ],

                    // Work Portfolio Photos
                    if (provider.jobPhotos.isNotEmpty) ...[
                      const SizedBox(height: 22),
                      const Text(
                        'Verified Completed Work',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        height: 110,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: provider.jobPhotos.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 10),
                          itemBuilder: (ctx, i) {
                            return ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.network(
                                provider.jobPhotos[i],
                                width: 140,
                                height: 110,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Container(
                                  width: 140,
                                  height: 110,
                                  color: Colors.grey.shade200,
                                  child: const Icon(LucideIcons.image, color: Colors.grey),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],

                    const SizedBox(height: 30),

                    // Action Buttons
                    Row(
                      children: [
                        // Direct Call Button
                        if (provider.phone.isNotEmpty)
                          Container(
                            margin: const EdgeInsets.only(right: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0FDF4),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFBBF7D0)),
                            ),
                            child: IconButton(
                              icon: const Icon(LucideIcons.phone, color: Color(0xFF047857)),
                              tooltip: 'Call Specialist',
                              onPressed: () async {
                                final uri = Uri.parse('tel:${provider.phone}');
                                if (await canLaunchUrl(uri)) {
                                  await launchUrl(uri);
                                }
                              },
                            ),
                          ),

                        // Message Button
                        Container(
                          margin: const EdgeInsets.only(right: 10),
                          decoration: BoxDecoration(
                            color: AppTheme.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
                          ),
                          child: IconButton(
                            icon: const Icon(LucideIcons.messageSquare, color: AppTheme.primary),
                            tooltip: 'Direct Chat',
                            onPressed: () {
                              Navigator.pop(ctx);
                              if (authUser == null) return;
                              final chatId = '${authUser.uid}_${provider.uid}';
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ChatScreen(
                                    title: provider.fullName,
                                    subtitle: provider.serviceCategory ?? 'Verified Artisan',
                                    chatId: chatId,
                                    recipientName: provider.fullName,
                                  ),
                                ),
                              );
                            },
                          ),
                        ),

                        // Primary Book Specialist Button
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () {
                              final isHod = provider.rawData['isHod'] == true;
                              Navigator.pop(ctx);
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => CreateRequestScreen(
                                    initialCategory: provider.serviceCategory,
                                    targetProviderId: isHod ? provider.uid : null,
                                    targetProviderName: isHod ? provider.fullName : null,
                                  ),
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              elevation: 0,
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(LucideIcons.calendarCheck, size: 18),
                                SizedBox(width: 8),
                                Text(
                                  'Book Specialist',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final directory = Provider.of<ServiceProviderDirectoryProvider>(context);
    final verifiedList = directory.verifiedProviders;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Verified Specialists',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              'Admin-approved & background-checked',
              style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFBBF7D0)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(LucideIcons.shieldCheck, size: 14, color: Color(0xFF047857)),
                const SizedBox(width: 4),
                Text(
                  '${directory.totalVerifiedCount} Verified',
                  style: const TextStyle(
                    color: Color(0xFF047857),
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Search & Filter Header ──
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
            child: Column(
              children: [
                // Search Input
                TextField(
                  controller: _searchController,
                  onChanged: (val) => directory.setSearchQuery(val),
                  decoration: InputDecoration(
                    hintText: 'Search by name, skill, or location...',
                    hintStyle: const TextStyle(fontSize: 14, color: AppTheme.textSecondary),
                    prefixIcon: const Icon(LucideIcons.search, size: 20, color: AppTheme.textSecondary),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(LucideIcons.x, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              directory.setSearchQuery('');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: AppTheme.background,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppTheme.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppTheme.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                // Category Chips
                SizedBox(
                  height: 38,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: ServiceProviderDirectoryProvider.categories.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, idx) {
                      final cat = ServiceProviderDirectoryProvider.categories[idx];
                      final isSelected = directory.selectedCategory == cat;

                      return ChoiceChip(
                        label: Text(cat),
                        selected: isSelected,
                        onSelected: (selected) {
                          if (selected) {
                            directory.setSelectedCategory(cat);
                          }
                        },
                        selectedColor: AppTheme.primary,
                        backgroundColor: Colors.white,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : AppTheme.textPrimary,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          fontSize: 12,
                        ),
                        side: BorderSide(
                          color: isSelected ? AppTheme.primary : AppTheme.border,
                        ),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        showCheckmark: false,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),

          // ── Provider List ──
          Expanded(
            child: directory.isLoading
                ? const Center(child: CircularProgressIndicator())
                : verifiedList.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32.0),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade100,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(LucideIcons.searchX, size: 48, color: AppTheme.textSecondary),
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'No Verified Specialists Found',
                                style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Only admin-verified, background-checked providers are shown. Try adjusting your search query or trade filter.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4),
                              ),
                              const SizedBox(height: 20),
                              OutlinedButton.icon(
                                onPressed: () {
                                  _searchController.clear();
                                  directory.resetFilters();
                                },
                                icon: const Icon(LucideIcons.rotateCcw, size: 16),
                                label: const Text('Reset All Filters'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppTheme.primary,
                                  side: const BorderSide(color: AppTheme.primary),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: verifiedList.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 14),
                        itemBuilder: (context, idx) {
                          final provider = verifiedList[idx];
                          final catColor = _getCategoryColor(provider.serviceCategory);

                          return Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: AppTheme.border),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.03),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Material(
                              color: Colors.transparent,
                              borderRadius: BorderRadius.circular(18),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(18),
                                onTap: () => _showProviderDetails(context, provider),
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Top row: Avatar + Name + Verified Badge
                                      Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Stack(
                                            clipBehavior: Clip.none,
                                            children: [
                                              Container(
                                                width: 52,
                                                height: 52,
                                                decoration: BoxDecoration(
                                                  shape: BoxShape.circle,
                                                  color: catColor.withValues(alpha: 0.12),
                                                  border: Border.all(color: catColor.withValues(alpha: 0.25), width: 1.5),
                                                ),
                                                child: Center(
                                                  child: Text(
                                                    provider.fullName.isNotEmpty ? provider.fullName[0].toUpperCase() : 'P',
                                                    style: TextStyle(
                                                      fontSize: 22,
                                                      fontWeight: FontWeight.bold,
                                                      color: catColor,
                                                    ),
                                                  ),
                                                ),
                                              ),
                                              Positioned(
                                                bottom: -2,
                                                right: -2,
                                                child: Container(
                                                  padding: const EdgeInsets.all(3),
                                                  decoration: const BoxDecoration(
                                                    color: Color(0xFF047857),
                                                    shape: BoxShape.circle,
                                                  ),
                                                  child: const Icon(LucideIcons.check, size: 10, color: Colors.white),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(width: 14),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Row(
                                                  children: [
                                                    Expanded(
                                                      child: Text(
                                                        provider.fullName,
                                                        style: const TextStyle(
                                                          fontSize: 16,
                                                          fontWeight: FontWeight.bold,
                                                          color: AppTheme.textPrimary,
                                                        ),
                                                        maxLines: 1,
                                                        overflow: TextOverflow.ellipsis,
                                                      ),
                                                    ),
                                                    Container(
                                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                      decoration: BoxDecoration(
                                                        color: provider.rawData['isHod'] == true
                                                            ? const Color(0xFFF5F3FF)
                                                            : const Color(0xFFF0FDF4),
                                                        borderRadius: BorderRadius.circular(12),
                                                        border: Border.all(
                                                          color: provider.rawData['isHod'] == true
                                                              ? const Color(0xFFDDD6FE)
                                                              : const Color(0xFFBBF7D0),
                                                        ),
                                                      ),
                                                      child: Row(
                                                        mainAxisSize: MainAxisSize.min,
                                                        children: [
                                                          Icon(
                                                            provider.rawData['isHod'] == true
                                                                ? LucideIcons.crown
                                                                : LucideIcons.shieldCheck,
                                                            size: 12,
                                                            color: provider.rawData['isHod'] == true
                                                                ? const Color(0xFF7C3AED)
                                                                : const Color(0xFF047857),
                                                          ),
                                                          const SizedBox(width: 3),
                                                          Text(
                                                            provider.rawData['isHod'] == true
                                                                ? 'State HOD'
                                                                : 'Verified Pro',
                                                            style: TextStyle(
                                                              color: provider.rawData['isHod'] == true
                                                                  ? const Color(0xFF7C3AED)
                                                                  : const Color(0xFF047857),
                                                              fontSize: 10.5,
                                                              fontWeight: FontWeight.bold,
                                                            ),
                                                          ),
                                                        ],
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                if (provider.businessName != null && provider.businessName!.isNotEmpty) ...[
                                                  const SizedBox(height: 2),
                                                  Text(
                                                    provider.businessName!,
                                                    style: const TextStyle(
                                                      fontSize: 12,
                                                      fontWeight: FontWeight.w500,
                                                      color: AppTheme.textSecondary,
                                                    ),
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ],
                                                const SizedBox(height: 6),
                                                Row(
                                                  children: [
                                                    // Rating
                                                    const Icon(LucideIcons.star, size: 13, color: Color(0xFFF59E0B)),
                                                    const SizedBox(width: 3),
                                                    Text(
                                                      provider.rating.toStringAsFixed(1),
                                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                                    ),
                                                    const SizedBox(width: 8),
                                                    // Category Badge
                                                    Flexible(
                                                      child: Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                                        decoration: BoxDecoration(
                                                          color: catColor.withValues(alpha: 0.08),
                                                          borderRadius: BorderRadius.circular(6),
                                                        ),
                                                        child: Text(
                                                          provider.serviceCategory ?? 'Specialist',
                                                          maxLines: 1,
                                                          overflow: TextOverflow.ellipsis,
                                                          style: TextStyle(
                                                            fontSize: 11,
                                                            fontWeight: FontWeight.w600,
                                                            color: catColor,
                                                          ),
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),

                                      // Coverage / Bio snippet
                                      if ((provider.coverageArea != null && provider.coverageArea!.isNotEmpty) ||
                                          (provider.bio != null && provider.bio!.isNotEmpty)) ...[
                                        const SizedBox(height: 12),
                                        Row(
                                          children: [
                                            const Icon(LucideIcons.mapPin, size: 13, color: AppTheme.textSecondary),
                                            const SizedBox(width: 4),
                                            Expanded(
                                              child: Text(
                                                provider.coverageArea != null && provider.coverageArea!.isNotEmpty
                                                    ? provider.coverageArea!
                                                    : provider.bio ?? '',
                                                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],

                                      const SizedBox(height: 14),

                                      // Actions Row
                                      Row(
                                        children: [
                                          Expanded(
                                            child: OutlinedButton(
                                              onPressed: () => _showProviderDetails(context, provider),
                                              style: OutlinedButton.styleFrom(
                                                padding: const EdgeInsets.symmetric(vertical: 10),
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                                side: const BorderSide(color: AppTheme.border),
                                              ),
                                              child: const Text('View Profile', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
                                            ),
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: ElevatedButton(
                                              onPressed: () {
                                                final isHod = provider.rawData['isHod'] == true;
                                                Navigator.push(
                                                  context,
                                                  MaterialPageRoute(
                                                    builder: (_) => CreateRequestScreen(
                                                      initialCategory: provider.serviceCategory,
                                                      targetProviderId: isHod ? provider.uid : null,
                                                      targetProviderName: isHod ? provider.fullName : null,
                                                    ),
                                                  ),
                                                );
                                              },
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: AppTheme.primary,
                                                foregroundColor: Colors.white,
                                                padding: const EdgeInsets.symmetric(vertical: 10),
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                                elevation: 0,
                                              ),
                                              child: const Text('Book Now', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
