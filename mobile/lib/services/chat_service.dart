import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/chat_model.dart';

class ChatService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Stream messages for a specific job request (synchronized with web app UnifiedChat)
  Stream<List<ChatMessage>> streamJobMessages(String jobId) {
    return _firestore
        .collection('job_requests')
        .doc(jobId)
        .collection('messages')
        .orderBy('createdAt', descending: false)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        final data = Map<String, dynamic>.from(doc.data());
        final rawSenderName = (data['senderName'] ?? '').toString().trim();
        if (rawSenderName.isEmpty ||
            rawSenderName == 'You' ||
            rawSenderName == 'User') {
          data['senderName'] =
              data['role'] == 'provider' ? 'Service Provider' : 'Client';
        }
        return ChatMessage.fromMap(data, doc.id);
      }).toList();
    });
  }

  /// Stream job document metadata for read/delivery receipt fallbacks
  Stream<Map<String, dynamic>> streamJobMetadata(String jobId) {
    return _firestore
        .collection('job_requests')
        .doc(jobId)
        .snapshots()
        .map((snap) => snap.data() ?? <String, dynamic>{});
  }

  /// Mark incoming messages in a job chat as read when the chat screen is open
  Future<void> markJobMessagesAsRead({
    required String jobId,
    required String currentUserId,
    required String role,
  }) async {
    final isProvider = role == 'provider' || role == 'service_provider';
    final readField = isProvider ? 'providerLastReadAt' : 'clientLastReadAt';
    final deliveredField =
        isProvider ? 'providerLastDeliveredAt' : 'clientLastDeliveredAt';

    try {
      await _firestore.collection('job_requests').doc(jobId).update({
        readField: FieldValue.serverTimestamp(),
        deliveredField: FieldValue.serverTimestamp(),
        'lastMessageStatus': 'read',
      });
    } catch (_) {}
  }

  /// Send message inside a job request
  Future<void> sendJobMessage({
    required String jobId,
    required String text,
    required String senderId,
    required String senderName,
    required String role,
  }) async {
    final cleanText = text.trim();
    final isProviderSender = role == 'provider' || role == 'service_provider';
    final readField =
        isProviderSender ? 'providerLastReadAt' : 'clientLastReadAt';
    final deliveredField =
        isProviderSender ? 'providerLastDeliveredAt' : 'clientLastDeliveredAt';

    final messageData = {
      'text': cleanText,
      'senderId': senderId,
      'senderName': senderName,
      'role': role,
      'status': 'sent',
      'delivered': false,
      'read': false,
      'createdAt': FieldValue.serverTimestamp(),
    };

    final jobRef = _firestore.collection('job_requests').doc(jobId);

    await Future.wait([
      jobRef.collection('messages').add(messageData),
      jobRef.update({
        'lastMessage': cleanText,
        'lastMessageSenderId': senderId,
        'lastMessageSenderName': senderName,
        'lastMessageStatus': 'sent',
        'lastMessageTime': FieldValue.serverTimestamp(),
        readField: FieldValue.serverTimestamp(),
        deliveredField: FieldValue.serverTimestamp(),
      }).catchError((_) {}),
    ]);

    // Also notify counterparty
    try {
      final jobSnap = await jobRef.get();
      if (jobSnap.exists && jobSnap.data() != null) {
        final jd = jobSnap.data()!;
        final isProviderSender =
            role == 'provider' || role == 'service_provider';
        final targetUid = isProviderSender
            ? (jd['clientId'] ?? jd['userId'] ?? '').toString()
            : (jd['providerId'] ?? jd['hodId'] ?? '').toString();
        final reqCode = (jd['requestCode'] ??
                jd['trackingId'] ??
                jobId.substring(0, 6).toUpperCase())
            .toString();

        if (targetUid.isNotEmpty && targetUid != senderId) {
          final preview = cleanText.length > 120
              ? '${cleanText.substring(0, 117)}...'
              : cleanText;
          await _firestore.collection('notifications').add({
            'userId': targetUid,
            'recipientId': targetUid,
            'title': 'New Message from $senderName (#$reqCode) 💬',
            'message': preview,
            'body': preview,
            'type': 'chat',
            'read': false,
            'isRead': false,
            'createdAt': DateTime.now().toIso8601String(),
            'payload': {
              'jobId': jobId,
              'requestCode': reqCode,
              'title': jd['serviceType'] ?? 'Service Request',
              'subtitle': senderName,
            },
          });
        }
      }
    } catch (_) {
      // Ignored if document structure differs
    }
  }

  /// Stream messages for a direct conversation in /chats/{chatId}/messages
  Stream<List<ChatMessage>> streamDirectMessages(String chatId) {
    return _firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('createdAt', descending: false)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => ChatMessage.fromMap(doc.data(), doc.id))
          .toList();
    });
  }

  /// Send message in /chats/{chatId}/messages
  Future<void> sendDirectMessage({
    required String chatId,
    required String text,
    required String senderId,
    required String senderName,
    required String role,
  }) async {
    final messageData = {
      'text': text.trim(),
      'senderId': senderId,
      'senderName': senderName,
      'role': role,
      'createdAt': FieldValue.serverTimestamp(),
    };

    await _firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .add(messageData);

    await _firestore.collection('chats').doc(chatId).update({
      'lastMessage': text.trim(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  /// Get or create a direct chat thread between a client and an agent for a property
  Future<String> getOrCreatePropertyChat({
    required String clientId,
    required String clientName,
    required String agentId,
    required String agentName,
    required String propertyId,
    required String propertyTitle,
  }) async {
    // Check if an existing chat exists between these participants for this property
    final query = await _firestore
        .collection('chats')
        .where('participants', arrayContains: clientId)
        .where('propertyId', isEqualTo: propertyId)
        .limit(1)
        .get();

    if (query.docs.isNotEmpty) {
      return query.docs.first.id;
    }

    // Otherwise create a new direct chat document
    final docRef = await _firestore.collection('chats').add({
      'title': propertyTitle,
      'propertyId': propertyId,
      'participants': [clientId, agentId],
      'participantNames': {
        clientId: clientName,
        agentId: agentName,
      },
      'lastMessage': '',
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    return docRef.id;
  }

  /// Stream all conversations for a user
  Stream<List<ChatConversation>> streamUserConversations(String userId) {
    return _firestore
        .collection('chats')
        .where('participants', arrayContains: userId)
        .orderBy('updatedAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => ChatConversation.fromMap(doc.data(), doc.id))
          .toList();
    });
  }
}
