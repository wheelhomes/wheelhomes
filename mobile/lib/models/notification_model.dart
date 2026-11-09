import 'package:cloud_firestore/cloud_firestore.dart';

class NotificationModel {
  final String id;
  final String userId;
  final String title;
  final String body;
  final String type; // 'job_update' | 'escrow' | 'chat' | 'system' | 'info' | 'success'
  final bool isRead;
  final String createdAt;
  final Map<String, dynamic> payload;

  NotificationModel({
    required this.id,
    required this.userId,
    required this.title,
    required this.body,
    required this.type,
    this.isRead = false,
    required this.createdAt,
    this.payload = const {},
  });

  /// Normalized category used for filtering, icons, and tap navigation:
  /// 'chat' | 'escrow' | 'job_update' | 'system'
  String get category {
    final lowerTitle = title.toLowerCase();
    final lowerType = type.toLowerCase();
    if (lowerType == 'chat' ||
        lowerType == 'chat_message' ||
        lowerTitle.contains('message') ||
        lowerTitle.contains('chat')) {
      return 'chat';
    }
    if (lowerType == 'escrow' ||
        lowerTitle.contains('escrow') ||
        lowerTitle.contains('payment') ||
        lowerTitle.contains('paid')) {
      return 'escrow';
    }
    if (lowerType == 'job_update' ||
        lowerTitle.contains('job') ||
        lowerTitle.contains('request') ||
        lowerTitle.contains('hod') ||
        lowerTitle.contains('assistant') ||
        lowerTitle.contains('dispatched') ||
        lowerTitle.contains('completed') ||
        payload.containsKey('jobId')) {
      return 'job_update';
    }
    return 'system';
  }

  String? get jobId {
    final raw = payload['jobId'] ?? payload['requestId'];
    if (raw != null && raw.toString().trim().isNotEmpty) {
      return raw.toString().trim();
    }
    return null;
  }

  String? get requestCode {
    final raw = payload['requestCode'];
    if (raw != null && raw.toString().trim().isNotEmpty) {
      return raw.toString().trim();
    }
    return null;
  }

  factory NotificationModel.fromMap(Map<String, dynamic> map, String docId) {
    String parsedCreatedAt;
    final rawDate = map['createdAt'];
    if (rawDate is String && rawDate.isNotEmpty) {
      parsedCreatedAt = rawDate;
    } else if (rawDate is Timestamp) {
      parsedCreatedAt = rawDate.toDate().toIso8601String();
    } else {
      parsedCreatedAt = DateTime.now().toIso8601String();
    }

    final rawPayload = map['payload'] != null
        ? Map<String, dynamic>.from(map['payload'])
        : <String, dynamic>{};
    if (map['jobId'] != null && !rawPayload.containsKey('jobId')) {
      rawPayload['jobId'] = map['jobId'];
    }
    if (map['requestId'] != null && !rawPayload.containsKey('jobId')) {
      rawPayload['jobId'] = map['requestId'];
    }

    return NotificationModel(
      id: docId,
      userId: (map['userId'] ?? map['recipientId'] ?? '').toString(),
      title: (map['title'] ?? 'New Notification').toString(),
      body: (map['body'] ?? map['message'] ?? '').toString(),
      type: (map['type'] ?? 'system').toString(),
      isRead: map['isRead'] == true || map['read'] == true,
      createdAt: parsedCreatedAt,
      payload: rawPayload,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'recipientId': userId,
      'title': title,
      'body': body,
      'message': body,
      'type': type,
      'isRead': isRead,
      'read': isRead,
      'createdAt': createdAt,
      'payload': payload,
    };
  }

  NotificationModel copyWith({
    String? id,
    String? userId,
    String? title,
    String? body,
    String? type,
    bool? isRead,
    String? createdAt,
    Map<String, dynamic>? payload,
  }) {
    return NotificationModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      body: body ?? this.body,
      type: type ?? this.type,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt ?? this.createdAt,
      payload: payload ?? this.payload,
    );
  }
}
