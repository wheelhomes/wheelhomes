import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/property_provider.dart';
import '../../providers/request_provider.dart';
import '../../providers/payment_provider.dart';
import '../../providers/notification_provider.dart';
import '../../models/property_model.dart';
import '../../models/request_model.dart';
import '../requests/create_request_screen.dart';
import '../property/property_detail_screen.dart';
import '../property/create_property_screen.dart';
import '../chat/chat_screen.dart';
import '../chat/conversations_screen.dart';
import '../payment/payment_checkout_screen.dart';
import '../payment/payment_history_screen.dart';
import '../notifications/notifications_screen.dart';
import '../verification/document_upload_screen.dart';
import '../verification/pending_approval_screen.dart';

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
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final userProfile = authProvider.userProfile;
    final isProvider = userProfile?.role == 'service_provider';
    final isAgent = userProfile?.role == 'agent';

    // ── Each role gets its own dedicated workspace ──
    // • Service Provider → Jobs, Messages, Profile (no property browsing)
    // • Agent            → Listings, Messages, Profile
    // • Client           → Explore, Requests, Profile
    final List<Widget> tabs;
    final List<BottomNavigationBarItem> navItems;
    if (isProvider) {
      tabs = const [_ProviderHubTab(), ConversationsScreen(), _ProfileTab()];
      navItems = const [
        BottomNavigationBarItem(icon: Icon(LucideIcons.briefcase), label: 'Jobs'),
        BottomNavigationBarItem(icon: Icon(LucideIcons.messageSquare), label: 'Messages'),
        BottomNavigationBarItem(icon: Icon(LucideIcons.user), label: 'Profile'),
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
                          Text('Wheelhomes 🏡', style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: AppTheme.primary)),
                          const SizedBox(height: 4),
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
                                            ? const Color(0xFF2563EB)
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
                                        ? const Color(0xFF1D4ED8)
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
                                              ? const Color(0xFF1E40AF)
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
                                              ? const Color(0xFF2563EB)
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

                  // Categories
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: ['All', 'Apartment', 'Studio', 'Villa', 'For Rent', 'For Sale'].map((cat) {
                        final isSelected = propertyProvider.selectedCategory == cat;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8.0),
                          child: FilterChip(
                            selected: isSelected,
                            label: Text(cat),
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
              color: Colors.black.withOpacity(0.04),
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
                    bottom: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.7),
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

class _ServiceRequestsTab extends StatelessWidget {
  const _ServiceRequestsTab();

  @override
  Widget build(BuildContext context) {
    final requestProvider = Provider.of<RequestProvider>(context);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('My Service Requests 🛠️', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 6),
            Text('Track repairs, plumbing, electrical, and maintenance', style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 20),

            Expanded(
              child: requestProvider.userRequests.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.clipboardCheck, size: 48, color: Colors.grey[400]),
                          const SizedBox(height: 12),
                          const Text('No service requests yet.', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          if (Provider.of<AuthProvider>(context, listen: false).userProfile?.role != 'service_provider')
                            const Text('Tap "New Request" below to get started.', style: TextStyle(color: AppTheme.textSecondary)),
                        ],
                      ),
                    )
                  : ListView.builder(
                      itemCount: requestProvider.userRequests.length,
                      itemBuilder: (context, index) {
                        final req = requestProvider.userRequests[index];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.border),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.02),
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
                                  Text(
                                    req.serviceType,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primary.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      req.status.toUpperCase(),
                                      style: const TextStyle(
                                        color: AppTheme.primary,
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                req.description,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: AppTheme.textPrimary, height: 1.3),
                              ),
                              if (req.location['address'] != null && '${req.location['address']}'.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    const Icon(LucideIcons.mapPin, size: 14, color: AppTheme.textSecondary),
                                    const SizedBox(width: 4),
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
                              if (req.images.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                SizedBox(
                                  height: 60,
                                  child: ListView.builder(
                                    scrollDirection: Axis.horizontal,
                                    itemCount: req.images.length,
                                    itemBuilder: (context, imgIdx) {
                                      return Container(
                                        width: 60,
                                        height: 60,
                                        margin: const EdgeInsets.only(right: 8),
                                        decoration: BoxDecoration(
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(color: AppTheme.border),
                                        ),
                                        child: ClipRRect(
                                          borderRadius: BorderRadius.circular(8),
                                          child: Image.network(
                                            req.images[imgIdx],
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) => Container(
                                              color: Colors.grey[200],
                                              child: const Icon(LucideIcons.image, size: 20, color: Colors.grey),
                                            ),
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              ],
                              if (req.price != null) ...[
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text('Estimated Budget:', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                                    Text(
                                      '₦${req.price!.toStringAsFixed(0)}',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.primary),
                                    ),
                                  ],
                                ),
                              ],
                              const SizedBox(height: 10),
                              // Escrow Payment Status Badge
                              if (req.paymentStatus == 'escrow_held')
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFECFDF5),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3)),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(LucideIcons.shieldCheck, size: 14, color: Color(0xFF047857)),
                                      SizedBox(width: 6),
                                      Text(
                                        'Funds Secured in Escrow 🔒',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF047857),
                                        ),
                                      ),
                                    ],
                                  ),
                                )
                              else if (req.paymentStatus == 'released')
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(LucideIcons.checkCheck, size: 14, color: AppTheme.primary),
                                      SizedBox(width: 6),
                                      Text(
                                        'Payment Released to Provider ✅',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: AppTheme.primary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              const SizedBox(height: 12),
                              const Divider(height: 1, color: AppTheme.border),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  if (req.paymentStatus == 'unpaid')
                                    ElevatedButton.icon(
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
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                        visualDensity: VisualDensity.compact,
                                      ),
                                    )
                                  else if (req.paymentStatus == 'escrow_held')
                                    OutlinedButton.icon(
                                      onPressed: () => _confirmReleaseEscrow(context, req),
                                      icon: const Icon(LucideIcons.check, size: 14, color: Color(0xFF047857)),
                                      label: const Text('Release Escrow', style: TextStyle(fontSize: 12, color: Color(0xFF047857), fontWeight: FontWeight.bold)),
                                      style: OutlinedButton.styleFrom(
                                        side: const BorderSide(color: Color(0xFF047857)),
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                        visualDensity: VisualDensity.compact,
                                      ),
                                    )
                                  else
                                    const SizedBox.shrink(),
                                  TextButton.icon(
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
                                    icon: const Icon(LucideIcons.messageSquare, size: 16),
                                    label: const Text('Chat / Messages'),
                                    style: TextButton.styleFrom(
                                      foregroundColor: AppTheme.primary,
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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

  void _confirmReleaseEscrow(BuildContext context, ServiceRequestModel req) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Release Escrow Payment?'),
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
                transactionId: '',
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

class _ProviderHubTab extends StatefulWidget {
  const _ProviderHubTab();

  @override
  State<_ProviderHubTab> createState() => _ProviderHubTabState();
}

class _ProviderHubTabState extends State<_ProviderHubTab> {
  int _selectedSubTab = 0; // 0 = Available Market, 1 = My Active Jobs
  String _selectedTrade = 'All';

  final List<String> _tradeFilters = [
    'All',
    'Plumbing',
    'Electrical',
    'Roofing',
    'AC & HVAC',
    'Painting',
    'Handyman',
    'Cleaning',
  ];

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;
    final userProfile = authProvider.userProfile;
    final requestProvider = Provider.of<RequestProvider>(context);

    final openJobs = requestProvider.openMarketJobs;
    final myJobs = requestProvider.providerJobs;

    final filteredOpenJobs = openJobs.where((j) {
      if (_selectedTrade == 'All') return true;
      return j.serviceType.toLowerCase().contains(_selectedTrade.toLowerCase());
    }).toList();

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title & Subtitle
            Text('Job Hub 💼', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 4),
            Text('Find new client jobs and manage your active work.', style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 16),

            // Metrics & Verification Card
            Container(
              padding: const EdgeInsets.all(16),
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
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.accent.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.shieldCheck, color: AppTheme.accent, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                userProfile?.fullName ?? 'Service Provider',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 6),
                            if (userProfile?.isVerified == true)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFECFDF5),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'VERIFIED',
                                style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF047857)),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Market: ${openJobs.length} available • Active: ${myJobs.length} assigned',
                          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // KYC Status Alert Banner (For Artisans)
            if (userProfile != null && !userProfile.isVerified) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: userProfile.isRejected
                      ? const Color(0xFFFEF2F2)
                      : userProfile.isPendingReview
                          ? const Color(0xFFEFF6FF)
                          : const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(14),
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
                      size: 22,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            userProfile.isRejected
                                ? 'Verification Update Needed'
                                : userProfile.isPendingReview
                                    ? 'KYC In Review'
                                    : 'Account Not Verified',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: userProfile.isRejected
                                  ? const Color(0xFF991B1B)
                                  : userProfile.isPendingReview
                                      ? const Color(0xFF1E40AF)
                                      : const Color(0xFF92400E),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            userProfile.isRejected
                                ? (userProfile.rejectionReason != null && userProfile.rejectionReason!.isNotEmpty
                                    ? userProfile.rejectionReason!
                                    : 'Compliance requested updates to your documents.')
                                : userProfile.isPendingReview
                                    ? 'Documents submitted. Awaiting compliance review.'
                                    : 'Upload your Government ID & selfie to claim jobs.',
                            style: TextStyle(
                              fontSize: 11,
                              color: userProfile.isRejected
                                  ? const Color(0xFFB91C1C)
                                  : userProfile.isPendingReview
                                      ? const Color(0xFF2563EB)
                                      : const Color(0xFFB45309),
                            ),
                          ),
                        ],
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
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        visualDensity: VisualDensity.compact,
                      ),
                      child: Text(
                        userProfile.isRejected
                            ? 'Update Now'
                            : userProfile.isPendingReview
                                ? 'Status'
                                : 'Verify Now',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: userProfile.isRejected
                              ? const Color(0xFFDC2626)
                              : userProfile.isPendingReview
                                  ? const Color(0xFF1D4ED8)
                                  : const Color(0xFFB45309),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Segmented Tab Switcher
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedSubTab = 0),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: _selectedSubTab == 0 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: _selectedSubTab == 0
                              ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                              : null,
                        ),
                        child: Center(
                          child: Text(
                            'Available Market (${openJobs.length})',
                            style: TextStyle(
                              fontWeight: _selectedSubTab == 0 ? FontWeight.bold : FontWeight.normal,
                              color: _selectedSubTab == 0 ? AppTheme.primary : AppTheme.textSecondary,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedSubTab = 1),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: _selectedSubTab == 1 ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: _selectedSubTab == 1
                              ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)]
                              : null,
                        ),
                        child: Center(
                          child: Text(
                            'My Jobs (${myJobs.length})',
                            style: TextStyle(
                              fontWeight: _selectedSubTab == 1 ? FontWeight.bold : FontWeight.normal,
                              color: _selectedSubTab == 1 ? AppTheme.primary : AppTheme.textSecondary,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // SUBTAB 0: Available Jobs Market
            if (_selectedSubTab == 0) ...[
              // Trade Filters
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _tradeFilters.map((trade) {
                    final isSel = _selectedTrade == trade;
                    return Padding(
                      padding: const EdgeInsets.only(right: 6.0),
                      child: FilterChip(
                        selected: isSel,
                        label: Text(trade),
                        labelStyle: TextStyle(
                          color: isSel ? Colors.white : AppTheme.textPrimary,
                          fontSize: 11,
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
              const SizedBox(height: 12),

              Expanded(
                child: filteredOpenJobs.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.briefcase, size: 42, color: Colors.grey[400]),
                            const SizedBox(height: 12),
                            const Text('No open jobs right now.', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            const SizedBox(height: 4),
                            const Text('New client requests will appear here in real time.', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
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
                                  style: const TextStyle(color: AppTheme.textPrimary, height: 1.3),
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
                                    height: 54,
                                    child: ListView.builder(
                                      scrollDirection: Axis.horizontal,
                                      itemCount: job.images.length,
                                      itemBuilder: (context, i) => Container(
                                        width: 54,
                                        height: 54,
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
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.primary),
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
                                                _showVerificationGatingSheet(context, role: 'service_provider');
                                                return;
                                              }
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
                                              if (!mounted) return;

                                              final messenger = ScaffoldMessenger.of(context);
                                              final success = await requestProvider.acceptJob(
                                                jobId: job.id,
                                                providerId: user.uid,
                                              );
                                              if (!mounted) return;

                                              if (success) {
                                                messenger.showSnackBar(
                                                  const SnackBar(
                                                    content: Text('Job accepted successfully! Moved to My Jobs. 🎉'),
                                                    backgroundColor: AppTheme.accent,
                                                  ),
                                                );
                                                setState(() => _selectedSubTab = 1);
                                              }
                                            },
                                      icon: Icon(
                                        (userProfile?.isVerified == true) ? LucideIcons.checkCircle2 : LucideIcons.lock,
                                        size: 16,
                                      ),
                                      label: Text((userProfile?.isVerified == true) ? 'Accept Job' : 'Verify to Accept'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: (userProfile?.isVerified == true) ? AppTheme.primary : const Color(0xFF64748B),
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
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
            ] else ...[
              // SUBTAB 1: My Active / Assigned Jobs
              Expanded(
                child: myJobs.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.clipboardList, size: 42, color: Colors.grey[400]),
                            const SizedBox(height: 12),
                            const Text('No assigned jobs yet.', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            const SizedBox(height: 4),
                            const Text('Switch to the Available Market tab to accept incoming jobs.', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: myJobs.length,
                        itemBuilder: (context, index) {
                          final job = myJobs[index];
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
                                        color: AppTheme.primary.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        job.status.toUpperCase(),
                                        style: const TextStyle(color: AppTheme.primary, fontSize: 10, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  job.description,
                                  style: const TextStyle(color: AppTheme.textPrimary, height: 1.3),
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
                                const Divider(height: 1, color: AppTheme.border),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      job.price != null ? 'Fee: ₦${job.price!.toStringAsFixed(0)}' : 'Fee: Pending',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primary),
                                    ),
                                    TextButton.icon(
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
                                      icon: const Icon(LucideIcons.messageSquare, size: 16),
                                      label: const Text('Chat with Client'),
                                      style: TextButton.styleFrom(
                                        foregroundColor: AppTheme.primary,
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
          ],
        ),
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
            Text('Account Profile 👤', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 24),

            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                    child: Text(
                      userProfile?.fullName.isNotEmpty == true ? userProfile!.fullName[0] : 'U',
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primary),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(userProfile?.fullName ?? 'User', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(userProfile?.email ?? '', style: const TextStyle(color: AppTheme.textSecondary)),
                  const SizedBox(height: 12),
                  Chip(
                    label: Text(switch (userProfile?.role) {
                      'service_provider' => 'SERVICE PROVIDER',
                      'agent' => 'REAL ESTATE AGENT',
                      _ => 'CLIENT',
                    }),
                    backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                    labelStyle: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 11),
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
          const SizedBox(height: 24),

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
