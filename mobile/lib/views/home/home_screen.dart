import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme.dart';
import '../../core/app_logo.dart';
import '../../core/image_helper.dart';
import '../../providers/auth_provider.dart';
import '../../providers/property_provider.dart';
import '../../providers/request_provider.dart';
import '../../providers/payment_provider.dart';
import '../../providers/notification_provider.dart';
import '../../models/property_model.dart';
import '../../models/request_model.dart';
import '../requests/create_request_screen.dart';
import '../requests/request_detail_screen.dart';
import '../property/property_detail_screen.dart';
import '../property/create_property_screen.dart';
import '../chat/chat_screen.dart';
import '../chat/conversations_screen.dart';
import '../payment/payment_checkout_screen.dart';
import '../payment/payment_history_screen.dart';
import '../notifications/notifications_screen.dart';
import '../verification/document_upload_screen.dart';
import '../verification/pending_approval_screen.dart';
import '../provider/provider_jobs_tab.dart';
import '../provider/provider_market_tab.dart';
import '../provider/provider_messages_tab.dart';
import '../provider/provider_hub_tab.dart';
import '../../services/update_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      if (user != null) {
        final reqProvider = Provider.of<RequestProvider>(context, listen: false);
        reqProvider.listenToUserRequests(user.uid);
        reqProvider.listenToOpenJobs();
        reqProvider.listenToProviderJobs(user.uid);
        Provider.of<PaymentProvider>(context, listen: false).listenToUserTransactions(user.uid);
        Provider.of<NotificationProvider>(context, listen: false).listenToNotifications(user.uid);
      }
      // Silently check if a newer app version is available
      UpdateService.checkAndPromptUpdate(context);
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final userProfile = authProvider.userProfile;
    final isProvider = userProfile?.role == 'service_provider';
    final isAgent = userProfile?.role == 'agent';

    // ── Each role gets its own dedicated workspace ──
    // • Service Provider → Jobs, Market, Messages, Pro Hub
    // • Agent            → Listings, Messages, Profile
    // • Client           → Explore, Requests, Profile
    final List<Widget> tabs;
    final List<BottomNavigationBarItem> navItems;
    if (isProvider) {
      tabs = [
        ProviderMyJobsTab(onBrowseMarket: () => setState(() => _currentIndex = 1)),
        ProviderMarketTab(onViewJobInMyJobs: () => setState(() => _currentIndex = 0)),
        const ProviderMessagesTab(),
        const ProviderProHubTab(),
      ];
      navItems = const [
        BottomNavigationBarItem(icon: Icon(LucideIcons.briefcase), label: 'Jobs'),
        BottomNavigationBarItem(icon: Icon(LucideIcons.store), label: 'Market'),
        BottomNavigationBarItem(icon: Icon(LucideIcons.messageSquare), label: 'Messages'),
        BottomNavigationBarItem(icon: Icon(LucideIcons.layoutGrid), label: 'Pro Hub'),
      ];
    } else if (isAgent) {
      tabs = const [_ExploreTab(), ConversationsScreen(), _ProfileTab()];
      navItems = const [
        BottomNavigationBarItem(icon: Icon(LucideIcons.building2), label: 'Listings'),
        BottomNavigationBarItem(icon: Icon(LucideIcons.messageSquare), label: 'Messages'),
        BottomNavigationBarItem(icon: Icon(LucideIcons.user), label: 'Profile'),
      ];
    } else {
      tabs = const [_ExploreTab(), _ServiceRequestsTab(), _ProfileTab()];
      navItems = const [
        BottomNavigationBarItem(icon: Icon(LucideIcons.compass), label: 'Explore'),
        BottomNavigationBarItem(icon: Icon(LucideIcons.clipboardList), label: 'Requests'),
        BottomNavigationBarItem(icon: Icon(LucideIcons.user), label: 'Profile'),
      ];
    }
    final effectiveIndex = _currentIndex.clamp(0, tabs.length - 1);

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: IndexedStack(
        index: effectiveIndex,
        children: tabs,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppTheme.border, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: effectiveIndex,
          onTap: (idx) => setState(() => _currentIndex = idx),
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppTheme.primary,
          unselectedItemColor: AppTheme.textSecondary,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          unselectedLabelStyle: const TextStyle(fontSize: 12),
          elevation: 0,
          backgroundColor: Colors.white,
          items: navItems,
        ),
      ),
      floatingActionButton: (!isProvider && !isAgent && effectiveIndex == 1)
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CreateRequestScreen()),
                );
              },
              backgroundColor: AppTheme.primary,
              icon: const Icon(LucideIcons.plus, color: Colors.white),
              label: const Text('New Request', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : (isAgent && effectiveIndex == 0)
              ? FloatingActionButton.extended(
                  onPressed: () {
                    final profile = Provider.of<AuthProvider>(context, listen: false).userProfile;
                    if (profile != null && !profile.isVerified) {
                      _showVerificationGatingSheet(context, role: 'agent');
                      return;
                    }
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const CreatePropertyScreen()),
                    );
                  },
                  backgroundColor: AppTheme.primary,
                  icon: const Icon(LucideIcons.plus, color: Colors.white),
                  label: const Text('List Property', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                )
              : null,
    );
  }
}

class _ExploreTab extends StatelessWidget {
  const _ExploreTab();

  @override
  Widget build(BuildContext context) {
    final propertyProvider = Provider.of<PropertyProvider>(context);

    return SafeArea(
      child: CustomScrollView(
        key: const PageStorageKey('explore_scroll_view'),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // App Bar / Greeting
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const AppLogo(height: 38),
                          const SizedBox(height: 6),
                          Text(
                            Provider.of<AuthProvider>(context).userProfile?.role == 'agent'
                                ? 'Browse the market & manage your listings'
                                : 'Find your dream home',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => const ConversationsScreen()),
                              );
                            },
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.border),
                              ),
                              child: const Icon(LucideIcons.messageSquare, size: 20, color: AppTheme.primary),
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
                                      child: const Icon(LucideIcons.bell, size: 20, color: AppTheme.textPrimary),
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
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () => _showAccountQuickMenu(context),
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.border),
                              ),
                              child: const Icon(LucideIcons.user, size: 20, color: AppTheme.textPrimary),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // ── Prominent KYC Verification Banner (For Providers & Agents) ──
                  Consumer<AuthProvider>(
                    builder: (context, authProv, _) {
                      final profile = authProv.userProfile;
                      if (profile == null) return const SizedBox.shrink();
                      if (profile.role != 'service_provider' && profile.role != 'agent') {
                        return const SizedBox.shrink();
                      }
                      if (profile.isVerified) {
                        return const SizedBox.shrink();
                      }

                      final isPending = profile.isPendingReview;
                      final isRejected = profile.isRejected;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 20),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: isRejected
                                ? [const Color(0xFFFEF2F2), const Color(0xFFFFF1F2)]
                                : isPending
                                    ? [const Color(0xFFEFF6FF), const Color(0xFFF0FDF4)]
                                    : [const Color(0xFFFFFBEB), const Color(0xFFFEF3C7)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isRejected
                                ? const Color(0xFFFECACA)
                                : isPending
                                    ? const Color(0xFFBFDBFE)
                                    : const Color(0xFFFDE68A),
                            width: 1.2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: (isRejected
                                      ? Colors.red
                                      : isPending
                                          ? Colors.blue
                                          : Colors.amber)
                                  .withValues(alpha: 0.08),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: (isRejected
                                        ? const Color(0xFFEF4444)
                                        : isPending
                                            ? AppTheme.brandOrange
                                            : const Color(0xFFD97706))
                                    .withValues(alpha: 0.12),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                isRejected
                                    ? LucideIcons.alertTriangle
                                    : isPending
                                        ? LucideIcons.clockAlert
                                        : LucideIcons.shieldCheck,
                                color: isRejected
                                    ? const Color(0xFFDC2626)
                                    : isPending
                                        ? AppTheme.brandOrange
                                        : const Color(0xFFB45309),
                                size: 22,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    isRejected
                                        ? 'Verification Update Needed'
                                        : isPending
                                            ? 'Verification in Review'
                                            : 'Complete Your ${profile.role == 'agent' ? "Agent" : "Provider"} Setup',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: isRejected
                                          ? const Color(0xFF991B1B)
                                          : isPending
                                              ? AppTheme.secondaryDeep
                                              : const Color(0xFF92400E),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    isRejected
                                        ? (profile.rejectionReason != null && profile.rejectionReason!.isNotEmpty
                                            ? profile.rejectionReason!
                                            : 'Your documents require updates to verify your account.')
                                        : isPending
                                            ? 'Your documents have been submitted and are under review by compliance.'
                                            : 'Submit your trade details & ID to start receiving client jobs and payouts.',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isRejected
                                          ? const Color(0xFFB91C1C)
                                          : isPending
                                              ? AppTheme.secondaryDeep
                                              : const Color(0xFFB45309),
                                      height: 1.35,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  InkWell(
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => isPending
                                              ? const PendingApprovalScreen()
                                              : const DocumentUploadScreen(),
                                        ),
                                      );
                                    },
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          isRejected
                                              ? 'Update Documents'
                                              : isPending
                                                  ? 'View Status'
                                                  : 'Resume Setup (4 Steps)',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12.5,
                                            color: isRejected
                                                ? const Color(0xFFDC2626)
                                                : isPending
                                                    ? const Color(0xFF1D4ED8)
                                                    : const Color(0xFFD97706),
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        Icon(
                                          LucideIcons.arrowRight,
                                          size: 14,
                                          color: isRejected
                                              ? const Color(0xFFDC2626)
                                              : isPending
                                                  ? const Color(0xFF1D4ED8)
                                                  : const Color(0xFFD97706),
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
                    },
                  ),

                  // Search Input
                  TextField(
                    onChanged: (q) => propertyProvider.setSearchQuery(q),
                    decoration: const InputDecoration(
                      hintText: 'Search by location, title, or type...',
                      prefixIcon: Icon(LucideIcons.search, size: 20),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── Quick Book Home Services (Client / Resident) ──
                  if (Provider.of<AuthProvider>(context).userProfile?.role != 'service_provider') ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Hire Skilled Artisans 🛠️',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 16),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'Verified technicians with escrow protection',
                              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                            ),
                          ],
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const CreateRequestScreen()),
                            );
                          },
                          child: const Row(
                            children: [
                              Text('Book Pro', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              Icon(LucideIcons.chevronRight, size: 14),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _ServiceCategoryCard(
                            title: 'Plumbing',
                            subtitle: 'Pipes & Leaks',
                            icon: LucideIcons.droplets,
                            color: Color(0xFF047857),
                            categoryName: 'Plumbing & Water Piping',
                          ),
                          _ServiceCategoryCard(
                            title: 'Electrical',
                            subtitle: 'Wiring & Power',
                            icon: LucideIcons.zap,
                            color: Color(0xFFD97706),
                            categoryName: 'Electrical & Wiring Repair',
                          ),
                          _ServiceCategoryCard(
                            title: 'AC / HVAC',
                            subtitle: 'Cooling & Gas',
                            icon: LucideIcons.fan,
                            color: Color(0xFF0284C7),
                            categoryName: 'AC & HVAC Servicing',
                          ),
                          _ServiceCategoryCard(
                            title: 'Carpentry',
                            subtitle: 'Doors & Wood',
                            icon: LucideIcons.hammer,
                            color: Color(0xFFB45309),
                            categoryName: 'General Handyman & Carpentry',
                          ),
                          _ServiceCategoryCard(
                            title: 'Painting',
                            subtitle: 'Wall & Finish',
                            icon: LucideIcons.paintBucket,
                            color: Color(0xFF7C3AED),
                            categoryName: 'Painting & Renovation',
                          ),
                          _ServiceCategoryCard(
                            title: 'Roofing',
                            subtitle: 'Ceiling Repair',
                            icon: LucideIcons.home,
                            color: Color(0xFFE11D48),
                            categoryName: 'Roofing & Ceiling Leak',
                          ),
                          _ServiceCategoryCard(
                            title: 'Cleaning',
                            subtitle: 'Deep Clean',
                            icon: LucideIcons.sparkles,
                            color: Color(0xFF0D9488),
                            categoryName: 'Cleaning & Fumigation',
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Escrow Protection Guarantee Micro-banner
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFBBF7D0)),
                      ),
                      child: const Row(
                        children: [
                          Icon(LucideIcons.shieldCheck, size: 18, color: Color(0xFF047857)),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Wheelhomes Escrow Guarantee: Artisans are only paid after you inspect and approve the work.',
                              style: TextStyle(
                                fontSize: 11.5,
                                color: Color(0xFF047857),
                                fontWeight: FontWeight.w600,
                                height: 1.3,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 22),
                  ],

                  // Categories
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: ['All', 'Saved', 'Apartment', 'Studio', 'Villa', 'For Rent', 'For Sale'].map((cat) {
                        final isSelected = propertyProvider.selectedCategory == cat;
                        final labelText = cat == 'Saved'
                            ? (propertyProvider.savedCount > 0 ? 'Saved (${propertyProvider.savedCount})' : 'Saved')
                            : cat;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8.0),
                          child: FilterChip(
                            selected: isSelected,
                            avatar: cat == 'Saved'
                                ? Icon(
                                    LucideIcons.heart,
                                    size: 14,
                                    color: isSelected ? Colors.white : AppTheme.error,
                                  )
                                : null,
                            label: Text(labelText),
                            labelStyle: TextStyle(
                              color: isSelected ? Colors.white : AppTheme.textPrimary,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            ),
                            selectedColor: AppTheme.primary,
                            backgroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                              side: BorderSide(color: isSelected ? AppTheme.primary : AppTheme.border),
                            ),
                            onSelected: (_) => propertyProvider.setCategory(cat),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 24),

                  Text('Available Properties', style: Theme.of(context).textTheme.titleLarge),
                ],
              ),
            ),
          ),

          // Property Grid / List
          if (propertyProvider.isLoading && propertyProvider.properties.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(32.0),
                  child: CircularProgressIndicator(),
                ),
              ),
            )
          else if (propertyProvider.properties.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32.0, vertical: 24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.08),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(LucideIcons.home, size: 40, color: AppTheme.primary),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        propertyProvider.hasActiveFilters ? 'No matching properties' : 'No properties listed yet',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        propertyProvider.hasActiveFilters
                            ? 'No properties match your current search or category filter.'
                            : 'Verified real estate listings published by registered agents will appear here.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                      ),
                      if (propertyProvider.hasActiveFilters) ...[
                        const SizedBox(height: 16),
                        OutlinedButton.icon(
                          onPressed: () {
                            propertyProvider.setCategory('All');
                            propertyProvider.setSearchQuery('');
                          },
                          icon: const Icon(LucideIcons.rotateCcw, size: 16),
                          label: const Text('Reset Filters'),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final prop = propertyProvider.properties[index];
                    return _PropertyCardItem(property: prop);
                  },
                  childCount: propertyProvider.properties.length,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ServiceCategoryCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final String categoryName;

  const _ServiceCategoryCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.categoryName,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => CreateRequestScreen(initialCategory: categoryName),
          ),
        );
      },
      child: Container(
        width: 112,
        margin: const EdgeInsets.only(right: 12),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.2)),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.06),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 10),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 10.5, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }
}

class _PropertyCardItem extends StatelessWidget {
  final PropertyModel property;

  const _PropertyCardItem({required this.property});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => PropertyDetailScreen(property: property)),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: Stack(
                children: [
                  Image.network(
                    property.image,
                    height: 180,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 180,
                      color: Colors.grey[200],
                      child: const Center(child: Icon(LucideIcons.image, size: 40, color: Colors.grey)),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.primary,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        property.status.toUpperCase(),
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    right: 12,
                    child: Consumer<PropertyProvider>(
                      builder: (context, propProv, _) {
                        final isSaved = propProv.isSaved(property.id);
                        return GestureDetector(
                          onTap: () => propProv.toggleSaveProperty(property.id),
                          child: Container(
                            padding: const EdgeInsets.all(7),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.92),
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.12),
                                  blurRadius: 6,
                                ),
                              ],
                            ),
                            child: Icon(
                              LucideIcons.heart,
                              color: isSaved ? AppTheme.error : AppTheme.textSecondary,
                              size: 17,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  Positioned(
                    bottom: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        property.price,
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Info
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    property.title,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(LucideIcons.mapPin, size: 14, color: AppTheme.textSecondary),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          property.address,
                          style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _SpecItem(icon: LucideIcons.bed, label: '${property.beds} Beds'),
                      _SpecItem(icon: LucideIcons.bath, label: '${property.baths} Baths'),
                      _SpecItem(icon: LucideIcons.maximize2, label: '${property.sqft} SqFt'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SpecItem extends StatelessWidget {
  final IconData icon;
  final String label;

  const _SpecItem({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppTheme.primary),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      ],
    );
  }
}

class _ServiceRequestsTab extends StatefulWidget {
  const _ServiceRequestsTab();

  @override
  State<_ServiceRequestsTab> createState() => _ServiceRequestsTabState();
}

class _ServiceRequestsTabState extends State<_ServiceRequestsTab> {
  String _selectedFilter = 'All';

  @override
  Widget build(BuildContext context) {
    final requestProvider = Provider.of<RequestProvider>(context);
    final allRequests = requestProvider.userRequests;

    final displayedRequests = allRequests.where((req) {
      final s = req.status.toLowerCase();
      if (_selectedFilter == 'Active') {
        return s == 'pending' || s == 'open' || s == 'assigned' || s == 'in_progress';
      } else if (_selectedFilter == 'Completed') {
        return s == 'completed' || s == 'fully_completed' || req.paymentStatus == 'released';
      }
      return true;
    }).toList();

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('My Service Requests 🛠️', style: Theme.of(context).textTheme.headlineMedium),
                    const SizedBox(height: 4),
                    Text('Track maintenance, repairs, and escrow status', style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Filter Tabs
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['All', 'Active', 'Completed'].map((filter) {
                  final isSelected = _selectedFilter == filter;
                  final count = filter == 'All'
                      ? allRequests.length
                      : filter == 'Active'
                          ? allRequests.where((r) => r.status != 'completed' && r.status != 'fully_completed' && r.status != 'cancelled').length
                          : allRequests.where((r) => r.status == 'completed' || r.status == 'fully_completed' || r.paymentStatus == 'released').length;

                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: FilterChip(
                      selected: isSelected,
                      label: Text('$filter ($count)'),
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : AppTheme.textPrimary,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        fontSize: 12.5,
                      ),
                      selectedColor: AppTheme.primary,
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: isSelected ? AppTheme.primary : AppTheme.border),
                      ),
                      onSelected: (_) => setState(() => _selectedFilter = filter),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            Expanded(
              child: displayedRequests.isEmpty
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
                            child: Icon(LucideIcons.clipboardCheck, size: 48, color: Colors.grey[400]),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _selectedFilter == 'All'
                                ? 'No service requests yet.'
                                : 'No $_selectedFilter requests found.',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Need a plumber, electrician, AC repair, or carpentry?',
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => const CreateRequestScreen()),
                              );
                            },
                            icon: const Icon(LucideIcons.plus, size: 16),
                            label: const Text('Create New Request'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      itemCount: displayedRequests.length,
                      itemBuilder: (context, index) {
                        final req = displayedRequests[index];
                        return _buildRequestCard(context, req);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRequestCard(BuildContext context, ServiceRequestModel req) {
    final status = req.status.toLowerCase();
    final isCompleted = status == 'completed' || status == 'fully_completed';
    final isUnpaid = req.paymentStatus == 'unpaid';
    final isHeld = req.paymentStatus == 'escrow_held';
    final hasRated = req.clientRating != null && req.clientRating! > 0;

    final (statusLabel, statusColor, statusBg, statusIcon) = switch (status) {
      'completed' || 'fully_completed' => ('COMPLETED', const Color(0xFF047857), const Color(0xFFECFDF5), LucideIcons.badgeCheck),
      'in_progress' => ('IN PROGRESS', const Color(0xFF1D4ED8), const Color(0xFFEFF6FF), LucideIcons.wrench),
      'assigned' => ('ASSIGNED', AppTheme.primary, AppTheme.primary.withValues(alpha: 0.1), LucideIcons.userCheck),
      'cancelled' => ('CANCELLED', AppTheme.error, const Color(0xFFFEF2F2), LucideIcons.xCircle),
      _ => ('PENDING', const Color(0xFFD97706), const Color(0xFFFFFBEB), LucideIcons.clockAlert),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => RequestDetailScreen(request: req),
            ),
          );
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Row: Category & Status Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      req.serviceType,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusBg,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: statusColor.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(statusIcon, size: 12, color: statusColor),
                        const SizedBox(width: 4),
                        Text(
                          statusLabel,
                          style: TextStyle(
                            color: statusColor,
                            fontSize: 10.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Description
              Text(
                req.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.35),
              ),

              // Location
              if (req.location['address'] != null && '${req.location['address']}'.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(LucideIcons.mapPin, size: 14, color: AppTheme.textSecondary),
                    const SizedBox(width: 5),
                    Expanded(
                      child: Text(
                        '${req.location['address']}',
                        style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],

              // Budget & Escrow Row
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (req.price != null) ...[
                    Row(
                      children: [
                        const Text('Budget: ', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                        Text(
                          '₦${req.price!.toStringAsFixed(0)}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.primary),
                        ),
                      ],
                    ),
                  ] else
                    const SizedBox.shrink(),

                  // Escrow Status Pill
                  if (isHeld)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.shieldCheck, size: 12, color: Color(0xFF047857)),
                          SizedBox(width: 4),
                          Text('Escrow Secured 🔒', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF047857))),
                        ],
                      ),
                    )
                  else if (req.paymentStatus == 'released')
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.checkCheck, size: 12, color: AppTheme.primary),
                          SizedBox(width: 4),
                          Text('Paid & Released ✅', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                        ],
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text('Escrow Unpaid', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.error)),
                    ),
                ],
              ),

              const SizedBox(height: 12),
              const Divider(height: 1, color: AppTheme.border),
              const SizedBox(height: 10),

              // Bottom Action Buttons
              Row(
                children: [
                  if (isUnpaid) ...[
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => PaymentCheckoutScreen(request: req),
                            ),
                          );
                        },
                        icon: const Icon(LucideIcons.lock, size: 14),
                        label: const Text('Pay Escrow 🔒', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          visualDensity: VisualDensity.compact,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ] else if (isHeld && isCompleted) ...[
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _confirmReleaseEscrow(context, req),
                        icon: const Icon(LucideIcons.checkCheck, size: 14),
                        label: const Text('Release Escrow', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF047857),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          visualDensity: VisualDensity.compact,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ] else if (isCompleted && !hasRated) ...[
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => RequestDetailScreen(request: req),
                            ),
                          );
                        },
                        icon: const Icon(LucideIcons.star, size: 14, color: Color(0xFFD97706)),
                        label: const Text('Rate Specialist ⭐', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: const Color(0xFFFFFBEB),
                          side: const BorderSide(color: Color(0xFFFDE68A)),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          visualDensity: VisualDensity.compact,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],

                  // Direct Chat
                  OutlinedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ChatScreen(
                            title: req.serviceType,
                            subtitle: req.location['address'] ?? 'Service Request',
                            jobId: req.id,
                          ),
                        ),
                      );
                    },
                    icon: const Icon(LucideIcons.messageSquare, size: 14),
                    label: const Text('Chat', style: TextStyle(fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.primary,
                      side: const BorderSide(color: AppTheme.border),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                  const SizedBox(width: 8),

                  // View Details Icon Arrow
                  IconButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => RequestDetailScreen(request: req),
                        ),
                      );
                    },
                    icon: const Icon(LucideIcons.chevronRight, size: 18, color: AppTheme.textSecondary),
                    tooltip: 'View Details',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmReleaseEscrow(BuildContext context, ServiceRequestModel req) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Release Escrow Payment? 🔒'),
        content: Text(
          'Confirm that the service (${req.serviceType}) has been completed satisfactorily. Once released, the payment is dispatched to the provider.',
          style: const TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final paymentProvider = Provider.of<PaymentProvider>(context, listen: false);
              final success = await paymentProvider.releaseEscrowPayment(
                jobId: req.id,
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(success 
                      ? 'Payment released to provider successfully! 🎉' 
                      : 'Failed to release payment. Please try again.'),
                    backgroundColor: success ? const Color(0xFF047857) : AppTheme.error,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF047857)),
            child: const Text('Confirm Release', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final userProfile = authProvider.userProfile;

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Account Profile 👤', style: Theme.of(context).textTheme.headlineMedium),
                TextButton.icon(
                  onPressed: () => _confirmSignOut(context, authProvider),
                  icon: const Icon(LucideIcons.logOut, size: 16, color: AppTheme.error),
                  label: const Text('Sign Out', style: TextStyle(color: AppTheme.error, fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ],
            ),

            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                children: [
                  ClipOval(
                    child: Container(
                      width: 72,
                      height: 72,
                      color: AppTheme.primary.withValues(alpha: 0.1),
                      child: (userProfile?.passportUrl != null && userProfile!.passportUrl!.isNotEmpty)
                          ? SafeImageHelper.buildImage(
                              userProfile.passportUrl,
                              width: 72,
                              height: 72,
                              fit: BoxFit.cover,
                              errorWidget: Center(
                                child: Text(
                                  userProfile.fullName.isNotEmpty ? userProfile.fullName[0] : 'U',
                                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primary),
                                ),
                              ),
                            )
                          : Center(
                              child: Text(
                                userProfile?.fullName.isNotEmpty == true ? userProfile!.fullName[0] : 'U',
                                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primary),
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(userProfile?.fullName ?? 'User', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(userProfile?.email ?? '', style: const TextStyle(color: AppTheme.textSecondary)),
                  const SizedBox(height: 12),
                  Builder(
                    builder: (context) {
                      final role = userProfile?.role;
                      final (label, color) = switch (role) {
                        'service_provider' => ('SERVICE PROVIDER', AppTheme.brandOrange),
                        'agent' => ('REAL ESTATE AGENT', AppTheme.slateDark),
                        _ => ('CLIENT', AppTheme.primary),
                      };
                      return Chip(
                        label: Text(label),
                        backgroundColor: color.withValues(alpha: 0.1),
                        side: BorderSide(color: color.withValues(alpha: 0.25)),
                        labelStyle: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Notifications & Alerts Tile
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(LucideIcons.bell, color: AppTheme.primary, size: 20),
                ),
                title: const Text('Activity & Alerts', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Updates, job alerts, and chat messages', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                trailing: Consumer<NotificationProvider>(
                  builder: (_, np, __) => Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (np.unreadCount > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.error,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${np.unreadCount}',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      const SizedBox(width: 6),
                      const Icon(LucideIcons.chevronRight, size: 18, color: AppTheme.textSecondary),
                    ],
                  ),
                ),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),

            // Payments & Escrow Tile (clients pay, providers get paid)
            if (userProfile?.role != 'agent') ...[
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(LucideIcons.receipt, color: AppTheme.primary, size: 20),
                ),
                title: Text(
                  userProfile?.role == 'service_provider' ? 'Earnings & Payouts' : 'Payment History & Escrow',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                subtitle: Text(
                  userProfile?.role == 'service_provider'
                      ? 'Track escrow releases for completed jobs'
                      : 'View receipts, escrow hold & release logs',
                  style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                ),
                trailing: const Icon(LucideIcons.chevronRight, size: 18, color: AppTheme.textSecondary),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const PaymentHistoryScreen()),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            ],

            // Identity Verification Tile (providers & agents only)
            if (userProfile?.role == 'service_provider' || userProfile?.role == 'agent') ...[
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: (userProfile?.isVerified == true
                            ? AppTheme.accent
                            : (userProfile?.isPendingReview == true
                                ? AppTheme.primary
                                : AppTheme.warning))
                        .withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  userProfile?.isVerified == true
                      ? LucideIcons.badgeCheck
                      : (userProfile?.isPendingReview == true
                          ? LucideIcons.clock
                          : LucideIcons.shieldAlert),
                  color: userProfile?.isVerified == true
                      ? AppTheme.accent
                      : (userProfile?.isPendingReview == true
                          ? AppTheme.primary
                          : AppTheme.warning),
                  size: 20,
                ),
              ),
              title: const Text('Identity Verification (KYC)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text(
                userProfile?.isVerified == true
                    ? 'Government ID & Passport Verified'
                    : (userProfile?.isPendingReview == true
                        ? 'Documents submitted & under review'
                        : 'Upload Government ID & Selfie'),
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: (userProfile?.isVerified == true
                              ? const Color(0xFFECFDF5)
                              : (userProfile?.isPendingReview == true
                                  ? const Color(0xFFEFF6FF)
                                  : const Color(0xFFFFFBEB))),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      userProfile?.isVerified == true
                          ? 'VERIFIED'
                          : (userProfile?.isPendingReview == true ? 'IN REVIEW' : 'UNVERIFIED'),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: userProfile?.isVerified == true
                            ? const Color(0xFF047857)
                            : (userProfile?.isPendingReview == true
                                ? const Color(0xFF1D4ED8)
                                : const Color(0xFFB45309)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Icon(LucideIcons.chevronRight, size: 18, color: AppTheme.textSecondary),
                ],
              ),
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
          ),
          const SizedBox(height: 12),
          ],

          // Escrow Protection Info Card (client & provider perspectives)
          if (userProfile?.role != 'agent')
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.shieldCheck, color: Color(0xFF047857), size: 28),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        userProfile?.role == 'service_provider'
                            ? 'Guaranteed Escrow Payouts'
                            : 'Escrow Buyer Protection Active',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF065F46)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        userProfile?.role == 'service_provider'
                            ? 'Clients fund jobs upfront. Payment is released to you once the job is confirmed complete.'
                            : 'Your funds are protected. Payments are only released after you confirm satisfaction.',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF047857), height: 1.3),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // App Version & Check Updates Tile
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(LucideIcons.sparkles, color: AppTheme.primary, size: 20),
              ),
              title: const Text(
                'App Version & Updates',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              subtitle: const Text(
                'v${UpdateService.currentVersion} • Tap to check for updates',
                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
              trailing: const Icon(LucideIcons.chevronRight, size: 18, color: AppTheme.textSecondary),
              onTap: () => UpdateService.checkAndPromptUpdate(context, isManualCheck: true),
            ),
          ),
          const SizedBox(height: 20),

          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              onPressed: () => authProvider.signOut(),
              icon: const Icon(LucideIcons.logOut, size: 20),
              label: const Text('Sign Out'),
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    ),
  );
}
}

void _showVerificationGatingSheet(BuildContext context, {required String role}) {
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
            Text(
              role == 'agent' ? 'Agent Verification Required' : 'Identity Verification Required',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              role == 'agent'
                  ? 'To maintain trusted property listings and protect home buyers, real estate agents must verify their identity before publishing listings.'
                  : 'To protect homeowners and release escrow payments safely, service providers must submit their Government ID and Passport photograph before accepting customer jobs.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4),
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

void _showAccountQuickMenu(BuildContext context) {
  final authProvider = Provider.of<AuthProvider>(context, listen: false);
  final userProfile = authProvider.userProfile;

  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                  child: Text(
                    userProfile?.fullName.isNotEmpty == true ? userProfile!.fullName[0].toUpperCase() : 'U',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primary),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        userProfile?.fullName ?? 'User',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        userProfile?.email ?? authProvider.user?.email ?? '',
                        style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
                Builder(
                  builder: (context) {
                    final role = userProfile?.role;
                    final (label, color) = switch (role) {
                      'service_provider' => ('SERVICE PROVIDER', AppTheme.brandOrange),
                      'agent' => ('REAL ESTATE AGENT', AppTheme.slateDark),
                      _ => ('CLIENT', AppTheme.primary),
                    };
                    return Chip(
                      label: Text(
                        label,
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
                      ),
                      backgroundColor: color.withValues(alpha: 0.08),
                      side: BorderSide(color: color.withValues(alpha: 0.2)),
                    );
                  },
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Divider(),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () async {
                  Navigator.pop(ctx);
                  await authProvider.signOut();
                },
                icon: const Icon(LucideIcons.logOut, size: 18),
                label: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.error,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
