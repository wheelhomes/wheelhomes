import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/notification_model.dart';

class NotificationService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Stream notifications for a specific user (listens to both recipientId and userId)
  Stream<List<NotificationModel>> streamNotifications(String userId) {
    final controller = StreamController<List<NotificationModel>>();
    Map<String, NotificationModel> byUserId = {};
    Map<String, NotificationModel> byRecipientId = {};
    bool sub1Ready = false;
    bool sub2Ready = false;

    void emitCombined() {
      if (controller.isClosed || !sub1Ready || !sub2Ready) return;
      final merged = <String, NotificationModel>{
        ...byUserId,
        ...byRecipientId,
      };
      final list = merged.values.toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      controller.add(list);
    }

    final sub1 = _firestore
        .collection('notifications')
        .where('userId', isEqualTo: userId)
        .snapshots()
        .listen((snap) {
      byUserId = {
        for (final doc in snap.docs)
          doc.id: NotificationModel.fromMap(doc.data(), doc.id),
      };
      sub1Ready = true;
      emitCombined();
    }, onError: (_) {
      sub1Ready = true;
      emitCombined();
    });

    final sub2 = _firestore
        .collection('notifications')
        .where('recipientId', isEqualTo: userId)
        .snapshots()
        .listen((snap) {
      byRecipientId = {
        for (final doc in snap.docs)
          doc.id: NotificationModel.fromMap(doc.data(), doc.id),
      };
      sub2Ready = true;
      emitCombined();
    }, onError: (_) {
      sub2Ready = true;
      emitCombined();
    });

    controller.onCancel = () {
      sub1.cancel();
      sub2.cancel();
      controller.close();
    };

    return controller.stream;
  }

  // Create and send a notification record (compatible with both Web and Mobile)
  Future<String> sendNotification({
    required String userId,
    required String title,
    required String body,
    required String type, // 'job_update' | 'escrow' | 'chat' | 'system'
    Map<String, dynamic> payload = const {},
  }) async {
    final docRef = await _firestore.collection('notifications').add({
      'userId': userId,
      'recipientId': userId,
      'title': title,
      'body': body,
      'message': body,
      'type': type,
      'isRead': false,
      'read': false,
      'createdAt': DateTime.now().toIso8601String(),
      'payload': payload,
    });
    return docRef.id;
  }

  // Mark single notification as read
  Future<void> markAsRead(String notificationId) async {
    await _firestore.collection('notifications').doc(notificationId).update({
      'isRead': true,
      'read': true,
    });
  }

  // Mark all unread notifications as read for a user
  Future<void> markAllAsRead(String userId) async {
    final snap1 = await _firestore
        .collection('notifications')
        .where('userId', isEqualTo: userId)
        .get()
        .catchError((_) => _firestore.collection('notifications').limit(0).get());
    final snap2 = await _firestore
        .collection('notifications')
        .where('recipientId', isEqualTo: userId)
        .get()
        .catchError((_) => _firestore.collection('notifications').limit(0).get());

    final docsById = <String, DocumentSnapshot<Map<String, dynamic>>>{};
    for (final d in snap1.docs) {
      docsById[d.id] = d;
    }
    for (final d in snap2.docs) {
      docsById[d.id] = d;
    }

    final batch = _firestore.batch();
    int count = 0;
    for (final doc in docsById.values) {
      final data = doc.data();
      if (data != null && (data['isRead'] != true || data['read'] != true)) {
        batch.update(doc.reference, {'isRead': true, 'read': true});
        count++;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  }
}
