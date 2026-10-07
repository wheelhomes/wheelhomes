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

  // Real-time Requests Stream for User
  Stream<List<ServiceRequestModel>> streamUserRequests(String userId) {
    return _firestore
        .collection('requests')
        .where('userId', isEqualTo: userId)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => ServiceRequestModel.fromMap(doc.data(), doc.id))
          .toList();
    });
  }

  // Real-time Stream of Open / Pending Requests for Providers (Marketplace)
  Stream<List<ServiceRequestModel>> streamOpenRequests() {
    return _firestore
        .collection('requests')
        .where('status', isEqualTo: 'pending')
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => ServiceRequestModel.fromMap(doc.data(), doc.id))
          .toList();
    });
  }

  // Real-time Stream of Jobs Assigned to a Specific Provider
  Stream<List<ServiceRequestModel>> streamProviderJobs(String providerId) {
    return _firestore
        .collection('requests')
        .where('providerId', isEqualTo: providerId)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => ServiceRequestModel.fromMap(doc.data(), doc.id))
          .toList();
    });
  }

  // Accept a Job Request
  Future<void> acceptJobRequest({
    required String jobId,
    required String providerId,
  }) async {
    await _firestore.collection('requests').doc(jobId).update({
      'status': 'assigned',
      'providerId': providerId,
      'acceptedAt': DateTime.now().toIso8601String(),
    });

    try {
      final reqDoc = await _firestore.collection('requests').doc(jobId).get();
      final clientId = reqDoc.data()?['userId'];
      final serviceType = reqDoc.data()?['serviceType'] ?? 'Service Request';

      if (clientId != null && '$clientId'.isNotEmpty) {
        await _firestore.collection('notifications').add({
          'userId': clientId,
          'title': 'Specialist Assigned 🛠️',
          'body': 'A verified specialist has accepted your $serviceType request and is dispatching.',
          'type': 'job_update',
          'isRead': false,
          'createdAt': DateTime.now().toIso8601String(),
          'payload': {'jobId': jobId},
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
    final docRef = await _firestore.collection('requests').add({
      'userId': userId,
      'serviceType': serviceType,
      'description': description,
      'location': location,
      'price': price,
      'status': 'pending',
      'createdAt': DateTime.now().toIso8601String(),
      'images': images,
    });
    return docRef.id;
  }

  // Create Property Listing
  Future<String> createProperty(Map<String, dynamic> propertyData) async {
    final docRef = await _firestore.collection('properties').add(propertyData);
    return docRef.id;
  }
}
