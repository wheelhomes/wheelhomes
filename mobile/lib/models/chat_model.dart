import 'package:cloud_firestore/cloud_firestore.dart';

class ChatMessage {
  final String id;
  final String text;
  final String senderId;
  final String senderName;
  final String role; // 'user' | 'provider' | 'agent' | 'admin'
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.text,
    required this.senderId,
    required this.senderName,
    required this.role,
    required this.createdAt,
  });

  factory ChatMessage.fromMap(Map<String, dynamic> map, String id) {
    DateTime parsedDate;
    final rawDate = map['createdAt'];
    if (rawDate is Timestamp) {
      parsedDate = rawDate.toDate();
    } else if (rawDate is String) {
      parsedDate = DateTime.tryParse(rawDate) ?? DateTime.now();
    } else {
      parsedDate = DateTime.now();
    }

    return ChatMessage(
      id: id,
      text: map['text'] ?? '',
      senderId: map['senderId'] ?? '',
      senderName: map['senderName'] ?? 'User',
      role: map['role'] ?? 'user',
      createdAt: parsedDate,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'text': text,
      'senderId': senderId,
      'senderName': senderName,
      'role': role,
      'createdAt': FieldValue.serverTimestamp(),
    };
  }
}

class ChatConversation {
  final String id;
  final String title;
  final List<String> participants;
  final Map<String, dynamic> participantNames;
  final String lastMessage;
  final DateTime updatedAt;
  final String? jobId;
  final String? propertyId;

  ChatConversation({
    required this.id,
    required this.title,
    required this.participants,
    required this.participantNames,
    required this.lastMessage,
    required this.updatedAt,
    this.jobId,
    this.propertyId,
  });

  factory ChatConversation.fromMap(Map<String, dynamic> map, String id) {
    DateTime parsedDate;
    final rawDate = map['updatedAt'] ?? map['createdAt'];
    if (rawDate is Timestamp) {
      parsedDate = rawDate.toDate();
    } else if (rawDate is String) {
      parsedDate = DateTime.tryParse(rawDate) ?? DateTime.now();
    } else {
      parsedDate = DateTime.now();
    }

    return ChatConversation(
      id: id,
      title: map['title'] ?? 'Conversation',
      participants: map['participants'] != null ? List<String>.from(map['participants']) : [],
      participantNames: map['participantNames'] != null ? Map<String, dynamic>.from(map['participantNames']) : {},
      lastMessage: map['lastMessage'] ?? '',
      updatedAt: parsedDate,
      jobId: map['jobId'],
      propertyId: map['propertyId'],
    );
  }
}
