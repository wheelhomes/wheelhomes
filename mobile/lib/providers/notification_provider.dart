import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/notification_model.dart';
import '../services/notification_service.dart';

class NotificationProvider extends ChangeNotifier {
  final NotificationService _notificationService = NotificationService();

  List<NotificationModel> _notifications = [];
  bool _isLoading = false;
  StreamSubscription<List<NotificationModel>>? _subscription;

  List<NotificationModel> get notifications => _notifications;
  int get unreadCount => _notifications.where((n) => !n.isRead).length;
  bool get isLoading => _isLoading;

  void listenToNotifications(String userId) {
    _subscription?.cancel();
    _subscription = _notificationService.streamNotifications(userId).listen(
      (notifs) {
        _notifications = notifs;
        notifyListeners();
      },
      onError: (e) {
        debugPrint('Error streaming notifications: $e');
      },
    );
  }

  Future<void> markAsRead(String notificationId) async {
    try {
      await _notificationService.markAsRead(notificationId);
      final index = _notifications.indexWhere((n) => n.id == notificationId);
      if (index != -1) {
        _notifications[index] = _notifications[index].copyWith(isRead: true);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error marking notification as read: $e');
    }
  }

  Future<void> markAllAsRead(String userId) async {
    _isLoading = true;
    notifyListeners();

    try {
      await _notificationService.markAllAsRead(userId);
      _notifications = _notifications.map((n) => n.copyWith(isRead: true)).toList();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      debugPrint('Error marking all notifications as read: $e');
      notifyListeners();
    }
  }

  Future<String?> sendNotification({
    required String userId,
    required String title,
    required String body,
    required String type,
    Map<String, dynamic> payload = const {},
  }) async {
    try {
      return await _notificationService.sendNotification(
        userId: userId,
        title: title,
        body: body,
        type: type,
        payload: payload,
      );
    } catch (e) {
      debugPrint('Error sending notification: $e');
      return null;
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
