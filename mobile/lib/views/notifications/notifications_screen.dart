import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme.dart';
import '../../models/notification_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../chat/chat_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  String _selectedFilter = 'all'; // 'all' | 'unread' | 'escrow' | 'chat' | 'job_update'

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      if (user != null) {
        Provider.of<NotificationProvider>(context, listen: false)
            .listenToNotifications(user.uid);
      }
    });
  }

  String _formatTime(String isoString) {
    try {
      final dt = DateTime.parse(isoString);
      final now = DateTime.now();
      final diff = now.difference(dt);

      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return '';
    }
  }

  void _handleNotificationTap(NotificationModel notif) {
    final notifProvider = Provider.of<NotificationProvider>(context, listen: false);
    if (!notif.isRead) {
      notifProvider.markAsRead(notif.id);
    }

    if (notif.payload.containsKey('chatId') || notif.type == 'chat') {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ChatScreen(
            title: notif.payload['title'] ?? 'Chat Conversation',
            subtitle: notif.payload['subtitle'] ?? 'Direct Message',
            jobId: notif.payload['jobId'],
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final notifProvider = Provider.of<NotificationProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    final allNotifs = notifProvider.notifications;
    final filtered = allNotifs.where((n) {
      if (_selectedFilter == 'unread') return !n.isRead;
      if (_selectedFilter != 'all') return n.type == _selectedFilter;
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Activity & Alerts 🔔'),
        actions: [
          if (notifProvider.unreadCount > 0 && user != null)
            TextButton.icon(
              onPressed: () => notifProvider.markAllAsRead(user.uid),
              icon: const Icon(LucideIcons.checkCheck, size: 16),
              label: const Text('Mark all read', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              style: TextButton.styleFrom(foregroundColor: AppTheme.primary),
            ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips Strip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('all', 'All (${allNotifs.length})'),
                  const SizedBox(width: 8),
                  _buildFilterChip('unread', 'Unread (${notifProvider.unreadCount})'),
                  const SizedBox(width: 8),
                  _buildFilterChip('escrow', 'Escrow 🔒'),
                  const SizedBox(width: 8),
                  _buildFilterChip('chat', 'Chat 💬'),
                  const SizedBox(width: 8),
                  _buildFilterChip('job_update', 'Jobs 🛠️'),
                ],
              ),
            ),
          ),
          const Divider(height: 1, color: AppTheme.border),

          // Notifications List
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withValues(alpha: 0.08),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              LucideIcons.bellOff,
                              size: 48,
                              color: AppTheme.primary,
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'All Caught Up!',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'You do not have any alerts matching this filter. Real-time updates regarding your jobs, chat messages, and escrow payments will appear here.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final notif = filtered[index];
                      return _buildNotificationCard(notif);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String filterKey, String label) {
    final isSelected = _selectedFilter == filterKey;
    return InkWell(
      onTap: () => setState(() => _selectedFilter = filterKey),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : AppTheme.background,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppTheme.primary : AppTheme.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : AppTheme.textPrimary,
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationCard(NotificationModel notif) {
    IconData icon;
    Color iconBg;
    Color iconColor;

    switch (notif.type) {
      case 'escrow':
        icon = LucideIcons.shieldCheck;
        iconBg = const Color(0xFFECFDF5);
        iconColor = const Color(0xFF047857);
        break;
      case 'chat':
        icon = LucideIcons.messageSquare;
        iconBg = AppTheme.primary.withValues(alpha: 0.1);
        iconColor = AppTheme.primary;
        break;
      case 'job_update':
        icon = LucideIcons.wrench;
        iconBg = Colors.amber.withValues(alpha: 0.15);
        iconColor = Colors.amber[900]!;
        break;
      default:
        icon = LucideIcons.bell;
        iconBg = Colors.purple.withValues(alpha: 0.1);
        iconColor = Colors.purple;
    }

    return InkWell(
      onTap: () => _handleNotificationTap(notif),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: notif.isRead ? Colors.white : const Color(0xFFF0F9FF), // Sky 50 tint for unread
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: notif.isRead ? AppTheme.border : AppTheme.primary.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          notif.title,
                          style: TextStyle(
                            fontWeight: notif.isRead ? FontWeight.w600 : FontWeight.bold,
                            fontSize: 14,
                            color: AppTheme.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _formatTime(notif.createdAt),
                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notif.body,
                    style: TextStyle(
                      fontSize: 12,
                      color: notif.isRead ? AppTheme.textSecondary : AppTheme.textPrimary,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            if (!notif.isRead) ...[
              const SizedBox(width: 8),
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 6),
                decoration: const BoxDecoration(
                  color: AppTheme.primary,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
