import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../core/chat_sound.dart';
import '../models/request_model.dart';
import '../services/firestore_service.dart';
import '../services/storage_service.dart';

class RequestProvider with ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();
  final StorageService _storageService = StorageService();
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  List<ServiceRequestModel> _userRequests = [];
  List<ServiceRequestModel> _openMarketJobs = [];
  List<ServiceRequestModel> _providerJobs = [];
  bool _isSubmitting = false;
  final Map<String, String> _seenUserJobMessages = {};
  final Map<String, String> _seenProviderJobMessages = {};
  final Map<String, StreamSubscription<QuerySnapshot>> _jobMessageSubs = {};
  bool _userRequestsInitialLoaded = false;
  bool _providerJobsInitialLoaded = false;

  List<ServiceRequestModel> get userRequests => _userRequests;
  List<ServiceRequestModel> get openMarketJobs => _openMarketJobs;
  List<ServiceRequestModel> get providerJobs => _providerJobs;
  List<ServiceRequestModel> get providerAssignedJobs => _providerJobs;
  bool get isSubmitting => _isSubmitting;

  /// Attaches a direct real-time listener to `job_requests/{jobId}/messages` for each
  /// of the user's jobs so whenever a chat message drops from the counterparty, the
  /// notification tune plays immediately and the message is marked as "delivered" (✓✓).
  void _ensureJobMessageWatchers(
    String currentUserId,
    List<ServiceRequestModel> jobs, {
    bool isProvider = false,
  }) {
    final deliveredField =
        isProvider ? 'providerLastDeliveredAt' : 'clientLastDeliveredAt';

    for (final job in jobs) {
      final subKey = '${currentUserId}_${job.id}';
      if (_jobMessageSubs.containsKey(subKey)) continue;

      bool firstSnap = true;
      final Set<String> seenMsgIds = {};

      _jobMessageSubs[subKey] = _db
          .collection('job_requests')
          .doc(job.id)
          .collection('messages')
          .snapshots()
          .listen((snapshot) {
        if (firstSnap) {
          bool hasUndeliveredFromOther = false;
          for (final d in snapshot.docs) {
            seenMsgIds.add(d.id);
            final data = d.data();
            final senderId = (data['senderId'] ?? '').toString();
            if (senderId.isNotEmpty && senderId != currentUserId) {
              hasUndeliveredFromOther = true;
            }
          }
          if (hasUndeliveredFromOther &&
              job.lastMessageSenderId != null &&
              job.lastMessageSenderId != currentUserId) {
            _db.collection('job_requests').doc(job.id).update({
              deliveredField: FieldValue.serverTimestamp(),
              if ((job.toMap()['lastMessageStatus'] ?? 'sent') == 'sent')
                'lastMessageStatus': 'delivered',
            }).catchError((_) {});
          }
          firstSnap = false;
          return;
        }

        for (final change in snapshot.docChanges) {
          if (change.type == DocumentChangeType.added &&
              !seenMsgIds.contains(change.doc.id)) {
            seenMsgIds.add(change.doc.id);
            final data = change.doc.data();
            final senderId = (data?['senderId'] ?? '').toString();
            if (senderId.isNotEmpty && senderId != currentUserId) {
              ChatSoundHelper.playIncomingTune();
              final senderName = (data?['senderName'] ?? 'New Message').toString();
              final msgText = (data?['text'] ?? '').toString();
              if (msgText.isNotEmpty) {
                ChatSoundHelper.showSystemNotification(
                  title: '$senderName • ${job.serviceType} 💬',
                  body: msgText,
                );
              }
              _db.collection('job_requests').doc(job.id).update({
                deliveredField: FieldValue.serverTimestamp(),
                'lastMessageStatus': 'delivered',
              }).catchError((_) {});
            }
          }
        }
      }, onError: (_) {});
    }
  }

  void listenToUserRequests(String userId) {
    _userRequestsInitialLoaded = false;
    _seenUserJobMessages.clear();
    _firestoreService.streamUserRequests(userId).listen((data) {
      for (final req in data) {
        final msg = (req.lastMessage ?? '').trim();
        final prev = _seenUserJobMessages[req.id];
        _seenUserJobMessages[req.id] = msg;
        if (_userRequestsInitialLoaded &&
            msg.isNotEmpty &&
            prev != null &&
            prev != msg &&
            req.lastMessageSenderId != userId) {
          ChatSoundHelper.playIncomingTune();
        }
      }
      _userRequestsInitialLoaded = true;
      _userRequests = data;
      _ensureJobMessageWatchers(userId, data, isProvider: false);
      notifyListeners();
    });
  }

  void listenToOpenJobs() {
    _firestoreService.streamOpenRequests().listen((data) {
      _openMarketJobs = data;
      notifyListeners();
    });
  }

  void listenToProviderJobs(String providerId) {
    _providerJobsInitialLoaded = false;
    _seenProviderJobMessages.clear();
    _firestoreService.streamProviderJobs(providerId).listen((data) {
      for (final job in data) {
        final msg = (job.lastMessage ?? '').trim();
        final prev = _seenProviderJobMessages[job.id];
        _seenProviderJobMessages[job.id] = msg;
        if (_providerJobsInitialLoaded &&
            msg.isNotEmpty &&
            prev != null &&
            prev != msg &&
            job.lastMessageSenderId != providerId) {
          ChatSoundHelper.playIncomingTune();
        }
      }
      _providerJobsInitialLoaded = true;
      _providerJobs = data;
      _ensureJobMessageWatchers(providerId, data, isProvider: true);
      notifyListeners();
    });
  }

  Future<bool> acceptJob({
    required String jobId,
    required String providerId,
  }) async {
    _isSubmitting = true;
    notifyListeners();
    try {
      await _firestoreService.acceptJobRequest(
        jobId: jobId,
        providerId: providerId,
      );
      _isSubmitting = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error accepting job: $e');
      _isSubmitting = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateJobStatus({
    required String jobId,
    required String status,
    String? note,
    String? eta,
    double? finalPrice,
    String? completionSummary,
  }) async {
    _isSubmitting = true;
    notifyListeners();
    try {
      await _firestoreService.updateJobStatus(
        jobId: jobId,
        status: status,
        note: note,
        eta: eta,
        finalPrice: finalPrice,
        completionSummary: completionSummary,
      );
      _isSubmitting = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error updating job status: $e');
      _isSubmitting = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> createRequest({
    required String userId,
    required String serviceType,
    required String description,
    required Map<String, dynamic> location,
    double? price,
    List<XFile> images = const [],
    String? providerId,
    String? providerName,
    String? clientState,
    String? preferredTime,
  }) async {
    _isSubmitting = true;
    notifyListeners();
    try {
      List<String> imageUrls = [];
      if (images.isNotEmpty) {
        final batchId = '${userId}_${DateTime.now().millisecondsSinceEpoch}';
        imageUrls = await _storageService.uploadServiceRequestImages(
          requestId: batchId,
          images: images,
        );
      }

      await _firestoreService.createServiceRequest(
        userId: userId,
        serviceType: serviceType,
        description: description,
        location: location,
        price: price,
        images: imageUrls,
        providerId: providerId,
        providerName: providerName,
        clientState: clientState,
        preferredTime: preferredTime,
      );
      _isSubmitting = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error creating request: $e');
      _isSubmitting = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> dispatchAssistant({
    required String jobId,
    required String hodUid,
    required String hodName,
    required String assistantName,
    required String assistantPhone,
    required String assistantArea,
    String? note,
  }) async {
    _isSubmitting = true;
    notifyListeners();
    try {
      await _firestoreService.dispatchAssistantToJob(
        jobId: jobId,
        hodUid: hodUid,
        hodName: hodName,
        assistantName: assistantName,
        assistantPhone: assistantPhone,
        assistantArea: assistantArea,
        note: note,
      );
      _isSubmitting = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error dispatching assistant: $e');
      _isSubmitting = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> submitServiceReview({
    required String jobId,
    required String providerId,
    required double rating,
    required String review,
  }) async {
    _isSubmitting = true;
    notifyListeners();
    try {
      await _firestoreService.submitServiceReview(
        jobId: jobId,
        providerId: providerId,
        rating: rating,
        review: review,
      );
      _isSubmitting = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error submitting service review: $e');
      _isSubmitting = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> cancelRequest({
    required String jobId,
    String? reason,
  }) async {
    _isSubmitting = true;
    notifyListeners();
    try {
      await _firestoreService.cancelServiceRequest(
        jobId: jobId,
        reason: reason,
      );
      _isSubmitting = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error cancelling service request: $e');
      _isSubmitting = false;
      notifyListeners();
      return false;
    }
  }
}
