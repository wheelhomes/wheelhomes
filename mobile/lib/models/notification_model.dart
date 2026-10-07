class NotificationModel {
  final String id;
  final String userId;
  final String title;
  final String body;
  final String type; // 'job_update' | 'escrow' | 'chat' | 'system'
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

  factory NotificationModel.fromMap(Map<String, dynamic> map, String docId) {
    return NotificationModel(
      id: docId,
      userId: map['userId'] ?? '',
      title: map['title'] ?? '',
      body: map['body'] ?? '',
      type: map['type'] ?? 'system',
      isRead: map['isRead'] ?? false,
      createdAt: map['createdAt'] is String
          ? map['createdAt']
          : DateTime.now().toIso8601String(),
      payload: map['payload'] != null ? Map<String, dynamic>.from(map['payload']) : {},
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'title': title,
      'body': body,
      'type': type,
      'isRead': isRead,
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
