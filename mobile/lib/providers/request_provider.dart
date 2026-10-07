import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../models/request_model.dart';
import '../services/firestore_service.dart';
import '../services/storage_service.dart';

class RequestProvider with ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();
  final StorageService _storageService = StorageService();

  List<ServiceRequestModel> _userRequests = [];
  List<ServiceRequestModel> _openMarketJobs = [];
  List<ServiceRequestModel> _providerJobs = [];
  bool _isSubmitting = false;

  List<ServiceRequestModel> get userRequests => _userRequests;
  List<ServiceRequestModel> get openMarketJobs => _openMarketJobs;
  List<ServiceRequestModel> get providerJobs => _providerJobs;
  bool get isSubmitting => _isSubmitting;

  void listenToUserRequests(String userId) {
    _firestoreService.streamUserRequests(userId).listen((data) {
      _userRequests = data;
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
    _firestoreService.streamProviderJobs(providerId).listen((data) {
      _providerJobs = data;
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

  Future<bool> createRequest({
    required String userId,
    required String serviceType,
    required String description,
    required Map<String, dynamic> location,
    double? price,
    List<XFile> images = const [],
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
}
