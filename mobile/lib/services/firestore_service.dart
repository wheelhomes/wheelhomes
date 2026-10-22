import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/property_model.dart';
import '../models/request_model.dart';

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Real-time Property Stream
  Stream<List<PropertyModel>> streamProperties() {
    return _firestore.collection('properties').snapshots().map((snapshot) {
      return snapshot.docs.map((doc) => PropertyModel.fromMap(doc.data(), doc.id)).toList();
    });
  }

  // Real-time Requests Stream for User (Client Requests)
  Stream<List<ServiceRequestModel>> streamUserRequests(String userId) {
    return _firestore
        .collection('job_requests')
        .where('clientId', isEqualTo: userId)
        .snapshots()
        .map((snapshot) {
      final list = snapshot.docs
          .map((doc) => ServiceRequestModel.fromMap(doc.data(), doc.id))
          .toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    });
  }

  // Real-time Stream of Open Requests for Providers (Marketplace)
  Stream<List<ServiceRequestModel>> streamOpenRequests() {
    return _firestore
        .collection('job_requests')
        .where('status', isEqualTo: 'open')
        .snapshots()
        .map((snapshot) {
      final list = snapshot.docs
          .map((doc) => ServiceRequestModel.fromMap(doc.data(), doc.id))
          .where((j) => (j.providerId == null || j.providerId!.isEmpty) && (j.price ?? 0) > 0)
          .toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    });
  }

  // Real-time Stream of Jobs Assigned to a Specific Provider
  Stream<List<ServiceRequestModel>> streamProviderJobs(String providerId) {
    return _firestore
        .collection('job_requests')
        .where('providerId', isEqualTo: providerId)
        .snapshots()
        .map((snapshot) {
      final list = snapshot.docs
          .map((doc) => ServiceRequestModel.fromMap(doc.data(), doc.id))
          .where((j) => j.status != 'archived')
          .toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    });
  }

  // Accept a Job Request
  Future<void> acceptJobRequest({
    required String jobId,
    required String providerId,
  }) async {
    // Security Guard: Provider must be fully approved by admin before accepting any job
    final providerDoc = await _firestore.collection('users').doc(providerId).get();
    final providerData = providerDoc.data();
    final providerRole = providerData?['role'];
    final providerStatus = providerData?['status'];

    if (providerRole == 'service_provider' && providerStatus != 'approved') {
      throw Exception('Service provider account must be approved by admin before accepting job requests.');
    }

    final acceptedAt = DateTime.now().toIso8601String();
    final updates = {
      'status': 'accepted',
      'providerId': providerId,
      'acceptedAt': acceptedAt,
    };

    try {
      await _firestore.collection('job_requests').doc(jobId).update(updates);
    } catch (_) {}
    try {
      await _firestore.collection('requests').doc(jobId).update(updates);
    } catch (_) {}

    try {
      DocumentSnapshot<Map<String, dynamic>> reqDoc = await _firestore.collection('job_requests').doc(jobId).get();
      if (!reqDoc.exists) {
        reqDoc = await _firestore.collection('requests').doc(jobId).get();
      }
      final clientId = reqDoc.data()?['clientId'] ?? reqDoc.data()?['userId'];
      final serviceType = reqDoc.data()?['serviceType'] ?? 'Service Request';

      if (clientId != null && clientId.toString().isNotEmpty) {
        await _firestore.collection('notifications').add({
          'userId': clientId,
          'recipientId': clientId,
          'title': 'Specialist Assigned 🛠️',
          'body': 'A verified specialist has accepted your $serviceType request and is dispatching.',
          'type': 'job_update',
          'isRead': false,
          'createdAt': acceptedAt,
          'payload': {'jobId': jobId},
        });
      }
    } catch (_) {}
  }

  // Update Job Status (Start, Complete, Cancel)
  Future<void> updateJobStatus({
    required String jobId,
    required String status,
    String? note,
    String? eta,
  }) async {
    final now = DateTime.now().toIso8601String();
    final updates = <String, dynamic>{
      'status': status,
      'updatedAt': now,
      if (status == 'in_progress') ...{
        'startTime': now,
        if (eta != null && eta.isNotEmpty) 'estimatedDuration': eta,
        if (note != null && note.isNotEmpty) ...{
          'note': note,
          'startNote': note,
        },
      },
      if (status == 'completed' || status == 'fully_completed') ...{
        'completedAt': now,
        'actualEndTime': now,
      },
      if (note != null && note.isNotEmpty) 'note': note,
    };

    try {
      await _firestore.collection('job_requests').doc(jobId).update(updates);
    } catch (_) {}
    try {
      await _firestore.collection('requests').doc(jobId).update(updates);
    } catch (_) {}

    try {
      DocumentSnapshot<Map<String, dynamic>> reqDoc = await _firestore.collection('job_requests').doc(jobId).get();
      if (!reqDoc.exists) {
        reqDoc = await _firestore.collection('requests').doc(jobId).get();
      }
      final clientId = reqDoc.data()?['clientId'] ?? reqDoc.data()?['userId'];
      final serviceType = reqDoc.data()?['serviceType'] ?? 'Service Request';

      if (clientId != null && clientId.toString().isNotEmpty) {
        final title = status == 'in_progress'
            ? 'Job Started 🚀'
            : status == 'completed' || status == 'fully_completed'
                ? 'Job Completed 🎉'
                : 'Job Status Update';
        final body = status == 'in_progress'
            ? 'Specialist has started working on $serviceType.${eta != null ? " ETA: $eta" : ""}'
            : status == 'completed' || status == 'fully_completed'
                ? 'Specialist has marked $serviceType as completed. Please confirm to release payment.'
                : 'Your $serviceType status was updated to $status.';

        await _firestore.collection('notifications').add({
          'userId': clientId,
          'recipientId': clientId,
          'title': title,
          'body': body,
          'type': 'job_update',
          'isRead': false,
          'createdAt': now,
          'payload': {'jobId': jobId, 'status': status},
        });
      }
    } catch (_) {}
  }

  // Create Service Request
  Future<String> createServiceRequest({
    required String userId,
    required String serviceType,
    required String description,
    required Map<String, dynamic> location,
    double? price,
    List<String> images = const [],
  }) async {
    final now = DateTime.now().toIso8601String();
    final docData = {
      'userId': userId,
      'clientId': userId,
      'serviceType': serviceType,
      'description': description,
      'location': location,
      'price': price,
      'budget': price,
      'status': 'open',
      'createdAt': now,
      'images': images,
      'photos': images,
      'paymentStatus': 'unpaid',
    };

    final docRef = await _firestore.collection('job_requests').add(docData);
    try {
      await _firestore.collection('requests').doc(docRef.id).set(docData);
    } catch (_) {}

    return docRef.id;
  }

  // Create Property Listing
  Future<String> createProperty(Map<String, dynamic> propertyData) async {
    final docRef = await _firestore.collection('properties').add(propertyData);
    return docRef.id;
  }

  // Submit client rating & review for a completed service request
  Future<void> submitServiceReview({
    required String jobId,
    required String providerId,
    required double rating,
    required String review,
  }) async {
    final now = DateTime.now().toIso8601String();
    final reviewData = {
      'clientRating': rating,
      'rating': rating,
      'clientReview': review.trim(),
      'review': review.trim(),
      'ratedAt': now,
    };

    try {
      await _firestore.collection('job_requests').doc(jobId).update(reviewData);
    } catch (_) {}
    try {
      await _firestore.collection('requests').doc(jobId).update(reviewData);
    } catch (_) {}

    // Update provider profile rating and review count
    if (providerId.trim().isNotEmpty) {
      try {
        final userDocRef = _firestore.collection('users').doc(providerId.trim());
        final userSnap = await userDocRef.get();
        if (userSnap.exists) {
          final currentRating = double.tryParse('${userSnap.data()?['rating']}') ?? 5.0;
          final currentReviewCount = int.tryParse('${userSnap.data()?['reviewCount']}') ?? 0;
          final newCount = currentReviewCount + 1;
          final newRating = ((currentRating * currentReviewCount) + rating) / newCount;
          await userDocRef.update({
            'rating': double.parse(newRating.toStringAsFixed(1)),
            'reviewCount': newCount,
          });
        }
      } catch (_) {}

      try {
        await _firestore.collection('notifications').add({
          'userId': providerId.trim(),
          'recipientId': providerId.trim(),
          'title': 'New Review Received! ⭐',
          'body': 'A client rated your service $rating/5 stars: "${review.trim()}".',
          'type': 'review',
          'isRead': false,
          'createdAt': now,
          'payload': {'jobId': jobId, 'rating': rating},
        });
      } catch (_) {}
    }
  }

  // Cancel a pending service request (client only, before provider starts work)
  Future<void> cancelServiceRequest({
    required String jobId,
    String? reason,
  }) async {
    final now = DateTime.now().toIso8601String();
    final updates = {
      'status': 'cancelled',
      'cancellationReason': reason ?? 'Cancelled by client',
      'cancelledAt': now,
      'updatedAt': now,
    };

    try {
      await _firestore.collection('job_requests').doc(jobId).update(updates);
    } catch (_) {}
    try {
      await _firestore.collection('requests').doc(jobId).update(updates);
    } catch (_) {}
  }
}
