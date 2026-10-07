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
      return snapshot.docs
          .map((doc) => ChatMessage.fromMap(doc.data(), doc.id))
          .toList();
    });
  }

  /// Send message inside a job request
  Future<void> sendJobMessage({
    required String jobId,
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
        .collection('job_requests')
        .doc(jobId)
        .collection('messages')
        .add(messageData);

    // Also update lastMessage on the job request if available
    try {
      await _firestore.collection('job_requests').doc(jobId).update({
        'lastMessage': text.trim(),
        'lastMessageTime': FieldValue.serverTimestamp(),
      });
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
