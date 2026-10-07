import 'package:flutter/material.dart';
import '../models/chat_model.dart';
import '../services/chat_service.dart';

class ChatProvider with ChangeNotifier {
  final ChatService _chatService = ChatService();

  List<ChatConversation> _conversations = [];
  bool _isSending = false;
  String? _errorMessage;

  List<ChatConversation> get conversations => _conversations;
  bool get isSending => _isSending;
  String? get errorMessage => _errorMessage;

  ChatService get service => _chatService;

  void listenToUserConversations(String userId) {
    _chatService.streamUserConversations(userId).listen((convos) {
      _conversations = convos;
      notifyListeners();
    }, onError: (err) {
      debugPrint('Error streaming conversations: $err');
    });
  }

  Stream<List<ChatMessage>> streamJobMessages(String jobId) {
    return _chatService.streamJobMessages(jobId);
  }

  Stream<List<ChatMessage>> streamDirectMessages(String chatId) {
    return _chatService.streamDirectMessages(chatId);
  }

  Future<bool> sendJobMessage({
    required String jobId,
    required String text,
    required String senderId,
    required String senderName,
    required String role,
  }) async {
    if (text.trim().isEmpty) return false;
    _isSending = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _chatService.sendJobMessage(
        jobId: jobId,
        text: text,
        senderId: senderId,
        senderName: senderName,
        role: role,
      );
      _isSending = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isSending = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> sendDirectMessage({
    required String chatId,
    required String text,
    required String senderId,
    required String senderName,
    required String role,
  }) async {
    if (text.trim().isEmpty) return false;
    _isSending = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _chatService.sendDirectMessage(
        chatId: chatId,
        text: text,
        senderId: senderId,
        senderName: senderName,
        role: role,
      );
      _isSending = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isSending = false;
      notifyListeners();
      return false;
    }
  }

  Future<String?> openPropertyChat({
    required String clientId,
    required String clientName,
    required String agentId,
    required String agentName,
    required String propertyId,
    required String propertyTitle,
  }) async {
    try {
      return await _chatService.getOrCreatePropertyChat(
        clientId: clientId,
        clientName: clientName,
        agentId: agentId,
        agentName: agentName,
        propertyId: propertyId,
        propertyTitle: propertyTitle,
      );
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return null;
    }
  }
}
