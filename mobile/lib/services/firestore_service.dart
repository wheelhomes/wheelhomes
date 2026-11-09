import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/property_model.dart';
import '../models/request_model.dart';
import '../models/user_model.dart';

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  static const List<Map<String, dynamic>> nigerianStates = [
    {
      'slug': 'lagos',
      'name': 'Lagos',
      'keywords': [
        'lagos', 'ikeja', 'lekki', 'victoria island', 'ikoyi', 'surulere',
        'yaba', 'ajah', 'abijo', 'abijon', 'lakowe', 'ibeju', 'ikorodu', 'epe',
        'badagry', 'maryland', 'gbagada', 'magodo', 'ogba', 'agege', 'alimosho',
        'festac', 'apapa', 'oshodi', 'sangotedo', 'chevron',
      ],
    },
    {
      'slug': 'abuja-fct',
      'name': 'Abuja (FCT)',
      'keywords': [
        'abuja', 'fct', 'wuse', 'maitama', 'garki', 'asokoro', 'gwarinpa',
        'jabi', 'utako', 'kubwa', 'lugbe', 'karu', 'nyanya', 'lokogoma', 'apo',
      ],
    },
    {
      'slug': 'ogun',
      'name': 'Ogun',
      'keywords': [
        'ogun', 'abeokuta', 'sango', 'ota', 'ijebu', 'sagamu', 'mowe', 'ibafo', 'arepo',
      ],
    },
    {
      'slug': 'rivers',
      'name': 'Rivers',
      'keywords': ['rivers', 'port harcourt', 'obio-akpor', 'eleme', 'bonny'],
    },
    {
      'slug': 'oyo',
      'name': 'Oyo',
      'keywords': ['oyo', 'ibadan', 'bodija', 'ogbomosho'],
    },
    {'slug': 'enugu', 'name': 'Enugu', 'keywords': ['enugu', 'nsukka']},
    {'slug': 'kano', 'name': 'Kano', 'keywords': ['kano']},
    {'slug': 'edo', 'name': 'Edo', 'keywords': ['edo', 'benin', 'benin city']},
    {'slug': 'delta', 'name': 'Delta', 'keywords': ['delta', 'asaba', 'warri']},
    {'slug': 'kaduna', 'name': 'Kaduna', 'keywords': ['kaduna', 'zaria']},
    {'slug': 'anambra', 'name': 'Anambra', 'keywords': ['anambra', 'awka', 'onitsha']},
    {'slug': 'akwa-ibom', 'name': 'Akwa Ibom', 'keywords': ['akwa ibom', 'uyo']},
    {'slug': 'kwara', 'name': 'Kwara', 'keywords': ['kwara', 'ilorin']},
    {'slug': 'osun', 'name': 'Osun', 'keywords': ['osun', 'osogbo', 'ife']},
    {'slug': 'ondo', 'name': 'Ondo', 'keywords': ['ondo', 'akure']},
    {'slug': 'ekiti', 'name': 'Ekiti', 'keywords': ['ekiti', 'ado-ekiti']},
    {'slug': 'plateau', 'name': 'Plateau', 'keywords': ['plateau', 'jos']},
    {'slug': 'cross-river', 'name': 'Cross River', 'keywords': ['cross river', 'calabar']},
    {'slug': 'abia', 'name': 'Abia', 'keywords': ['abia', 'umuahia', 'aba']},
    {'slug': 'imo', 'name': 'Imo', 'keywords': ['imo', 'owerri']},
  ];

  static String slugify(String raw) {
    final s = raw.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-').replaceAll(RegExp(r'^-+|-+$'), '');
    return s.isEmpty ? 'general' : s;
  }

  static Map<String, String> matchNigerianState(String? rawInput) {
    if (rawInput == null || rawInput.trim().isEmpty) {
      return {'slug': 'lagos', 'name': 'Lagos'};
    }
    final cleaned = rawInput.toLowerCase().replaceAll('state', '').trim();
    for (final st in nigerianStates) {
      final slug = st['slug'] as String;
      final name = st['name'] as String;
      if (cleaned == slug || cleaned == name.toLowerCase()) {
        return {'slug': slug, 'name': name};
      }
      final keywords = (st['keywords'] as List).cast<String>();
      for (final kw in keywords) {
        if (cleaned.contains(kw)) {
          return {'slug': slug, 'name': name};
        }
      }
    }
    return {'slug': 'lagos', 'name': 'Lagos'};
  }

  static Map<String, String> detectClientState({
    Map<String, dynamic>? userData,
    String? addressText,
    String? explicitState,
  }) {
    if (explicitState != null && explicitState.trim().isNotEmpty) {
      return matchNigerianState(explicitState);
    }
    if (userData != null) {
      final profileState = userData['state'] ??
          userData['city'] ??
          (userData['address'] is Map
              ? (userData['address']['state'] ?? userData['address']['city'])
              : userData['address']);
      if (profileState != null && profileState.toString().trim().isNotEmpty) {
        return matchNigerianState(profileState.toString());
      }
    }
    if (addressText != null && addressText.trim().isNotEmpty) {
      return matchNigerianState(addressText);
    }
    return {'slug': 'lagos', 'name': 'Lagos'};
  }

  // Real-time Property Stream
  Stream<List<PropertyModel>> streamProperties() {
    return _firestore.collection('properties').snapshots().map((snapshot) {
      return snapshot.docs.map((doc) => PropertyModel.fromMap(doc.data(), doc.id)).toList();
    });
  }

  // Real-time Requests Stream for User (Client Requests - uses clientId to satisfy Firestore security rules)
  Stream<List<ServiceRequestModel>> streamUserRequests(String userId) {
    return _firestore
        .collection('job_requests')
        .where('clientId', isEqualTo: userId)
        .snapshots()
        .map((snapByClientId) {
      final byId = <String, ServiceRequestModel>{};
      for (final doc in snapByClientId.docs) {
        byId[doc.id] = ServiceRequestModel.fromMap(doc.data(), doc.id);
      }
      final list = byId.values.toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    });
  }

  // Under HOD Routing, requests never go to a public open market for all providers.
  Stream<List<ServiceRequestModel>> streamOpenRequests() {
    return Stream.value(const <ServiceRequestModel>[]);
  }

  // Real-time Stream of Jobs Routed to a Specific Provider / HOD
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
          'title': 'Department HOD Accepted 🛠️',
          'body': 'Your $serviceType request has been accepted and a technician is being dispatched.',
          'type': 'job_update',
          'isRead': false,
          'createdAt': acceptedAt,
          'payload': {'jobId': jobId},
        });
      }
    } catch (_) {}
  }

  // Dispatch Nearest Assistant / Technician (HOD Action)
  Future<void> dispatchAssistantToJob({
    required String jobId,
    required String hodUid,
    required String hodName,
    required String assistantName,
    required String assistantPhone,
    required String assistantArea,
    String? note,
  }) async {
    final now = DateTime.now().toIso8601String();
    final assistantData = {
      'id': 'ast_${DateTime.now().millisecondsSinceEpoch}',
      'name': assistantName.trim(),
      'phone': assistantPhone.trim(),
      'area': assistantArea.trim().isEmpty ? 'Nearest Zone' : assistantArea.trim(),
      'assignedByHodUid': hodUid,
      'assignedByHodName': hodName,
      'assignedAt': now,
      if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
    };

    final updates = {
      'status': 'accepted',
      'routingStatus': 'assistant_dispatched',
      'assignedAssistant': assistantData,
      'assistantName': assistantName.trim(),
      'assistantPhone': assistantPhone.trim(),
      'assistantArea': assistantData['area'],
      'acceptedAt': now,
      'updatedAt': now,
    };

    try {
      await _firestore.collection('job_requests').doc(jobId).update(updates);
    } catch (_) {}
    try {
      await _firestore.collection('requests').doc(jobId).update(updates);
    } catch (_) {}

    try {
      final reqDoc = await _firestore.collection('job_requests').doc(jobId).get();
      final clientId = reqDoc.data()?['clientId'] ?? reqDoc.data()?['userId'];
      final serviceType = reqDoc.data()?['serviceType'] ?? 'service';
      final reqCode = (reqDoc.data()?['requestCode'] ?? ServiceRequestModel.deriveRequestCodeFromId(jobId)).toString();
      if (clientId != null && clientId.toString().isNotEmpty) {
        await _firestore.collection('notifications').add({
          'userId': clientId,
          'recipientId': clientId,
          'title': 'Technician Dispatched (#$reqCode) 🛠️',
          'body': '$hodName assigned ${assistantName.trim()} (${assistantPhone.trim()} • ${assistantData['area']}) for Request #$reqCode. Ask the technician to quote #$reqCode at your door.',
          'type': 'job_update',
          'isRead': false,
          'createdAt': now,
          'payload': {'jobId': jobId, 'requestCode': reqCode},
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
    double? finalPrice,
    String? completionSummary,
  }) async {
    final now = DateTime.now().toIso8601String();
    DocumentSnapshot<Map<String, dynamic>>? existingSnap;
    try {
      existingSnap = await _firestore.collection('job_requests').doc(jobId).get();
    } catch (_) {}

    final existingPrice = double.tryParse(
      '${existingSnap?.data()?['initialBudget'] ?? existingSnap?.data()?['budget'] ?? existingSnap?.data()?['price'] ?? ''}',
    );

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
      if (status == 'awaiting_confirmation') ...{
        'actualEndTime': now,
        if (existingPrice != null && existingSnap?.data()?['initialBudget'] == null)
          'initialBudget': existingPrice,
        if (finalPrice != null && finalPrice > 0) ...{
          'finalAgreedPrice': finalPrice,
          'price': finalPrice,
          'budget': finalPrice,
        },
        if (completionSummary != null && completionSummary.trim().isNotEmpty)
          'completionSummary': completionSummary.trim(),
      },
      if (status == 'completed' || status == 'fully_completed') ...{
        'completedAt': now,
        'actualEndTime': now,
        'clientApproved': true,
        'clientApprovedAt': now,
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
            : status == 'awaiting_confirmation'
                ? 'Work Finished — Please Inspect & Approve 🛠️'
                : status == 'completed' || status == 'fully_completed'
                    ? 'Job Approved & Completed 🎉'
                    : 'Job Status Update';
        final body = status == 'in_progress'
            ? 'Specialist has started working on $serviceType.${eta != null ? " ETA: $eta" : ""}'
            : status == 'awaiting_confirmation'
                ? 'Specialist has finished working on $serviceType. Please inspect the work and approve that the job is well done to unlock payment.'
                : status == 'completed' || status == 'fully_completed'
                    ? 'You approved $serviceType as well done. You can now proceed to payment.'
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

  // Create Service Request with Smart HOD Routing (1 Category + 1 State = 1 HOD)
  Future<String> createServiceRequest({
    required String userId,
    required String serviceType,
    required String description,
    required Map<String, dynamic> location,
    double? price,
    List<String> images = const [],
    String? providerId,
    String? providerName,
    String? clientState,
    String? preferredTime,
  }) async {
    final now = DateTime.now().toIso8601String();

    // 1. Fetch client profile & HOD directory to perform smart Category + State matching
    Map<String, dynamic>? clientData;
    Map<String, dynamic>? hodDirectoryData;
    try {
      final results = await Future.wait([
        _firestore.collection('users').doc(userId).get(),
        _firestore.collection('app_config').doc('hod_directory').get(),
      ]);
      clientData = results[0].data();
      hodDirectoryData = results[1].data();
    } catch (_) {}

    final addressStr = (location['address'] ?? '').toString();
    final detectedState = detectClientState(
      userData: clientData,
      addressText: addressStr,
      explicitState: clientState,
    );
    final stateSlug = detectedState['slug']!;
    final stateName = detectedState['name']!;

    final clientFullName = (clientData?['fullName'] ??
            clientData?['displayName'] ??
            clientData?['email'] ??
            'Client')
        .toString();

    // 2. Match 1 HOD for (Service Category + State) — HOD Directory ALWAYS takes priority
    String? matchedHodUid;
    String? matchedHodName;
    String? matchedHodPhone;

    final rawAssignments = hodDirectoryData?['assignments'];
    if (rawAssignments is List) {
      final targetCatSlug = slugify(serviceType);
      final firstWord = targetCatSlug.split('-').first;

      for (final item in rawAssignments) {
        if (item is! Map) continue;
        if (item['isActive'] == false) continue;
        final itemStateSlug = (item['stateSlug'] ?? '').toString();
        if (itemStateSlug != stateSlug) continue;

        final itemCatId = slugify((item['categoryId'] ?? '').toString());
        final itemCatName = slugify((item['categoryName'] ?? '').toString());

        if (itemCatId == targetCatSlug ||
            itemCatName == targetCatSlug ||
            (firstWord.length >= 3 &&
                (itemCatId.contains(firstWord) || itemCatName.contains(firstWord)))) {
          matchedHodUid = item['hodUid']?.toString();
          matchedHodName = item['hodName']?.toString();
          matchedHodPhone = item['hodPhone']?.toString();
          break;
        }
      }
    }

    // Fallback to target provider ONLY if no State HOD is appointed for this Category + State
    if (matchedHodUid == null || matchedHodUid.isEmpty) {
      matchedHodUid = providerId;
      matchedHodName = providerName;
    }

    final hasHod = matchedHodUid != null && matchedHodUid.trim().isNotEmpty;
    final generatedCode = 'WOC-${100000 + (DateTime.now().microsecondsSinceEpoch % 900000)}';

    final docData = <String, dynamic>{
      'requestCode': generatedCode,
      'trackingId': generatedCode,
      'userId': userId,
      'clientId': userId,
      'clientName': clientFullName,
      'serviceType': serviceType,
      'category': slugify(serviceType),
      'description': description,
      'location': location,
      'clientState': stateName,
      'clientStateSlug': stateSlug,
      'preferredTime': preferredTime ?? 'As soon as possible',
      'price': price,
      'budget': price,
      // Never 'open' — requests route strictly to the 1 designated HOD (or Admin Fallback)
      'status': 'pending',
      'routingMode': hasHod ? 'hod_direct' : 'admin_fallback',
      'routingStatus': hasHod ? 'awaiting_hod_dispatch' : 'awaiting_admin_assignment',
      'hodId': hasHod ? matchedHodUid : '',
      'hodName': hasHod ? (matchedHodName ?? 'Department HOD') : '',
      'hodPhone': matchedHodPhone ?? '',
      'hodDepartment': '$serviceType — $stateName',
      'providerId': hasHod ? matchedHodUid : '',
      'providerName': hasHod ? '${matchedHodName ?? "HOD"} (HOD • $stateName)' : '',
      'invitedProviderIds': hasHod ? [matchedHodUid] : <String>[],
      'autoAssign': false,
      'isPublicMarket': false,
      'createdAt': now,
      'updatedAt': now,
      'images': images,
      'photos': images,
      'paymentStatus': 'unpaid',
    };

    final docRef = await _firestore.collection('job_requests').add(docData);
    try {
      await _firestore.collection('requests').doc(docRef.id).set(docData);
    } catch (_) {}

    // Notify ONLY the 1 designated HOD for this Category + State
    if (hasHod) {
      try {
        await _firestore.collection('notifications').add({
          'userId': matchedHodUid,
          'recipientId': matchedHodUid,
          'title': 'New $serviceType Request in $stateName 🛠️',
          'body': '$clientFullName requested $serviceType in $stateName. Review and dispatch your nearest assistant.',
          'type': 'job_update',
          'isRead': false,
          'createdAt': now,
          'payload': {'jobId': docRef.id},
        });
      } catch (_) {}
    }

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

  // Real-time Stream of ONLY Verified/Approved Service Providers for Clients
  Stream<List<UserProfile>> streamVerifiedProviders() {
    return _firestore
        .collection('users')
        .where('role', isEqualTo: 'service_provider')
        .where('status', isEqualTo: 'approved')
        .snapshots()
        .map((snapshot) {
      final results = <UserProfile>[];
      for (final doc in snapshot.docs) {
        try {
          final profile = UserProfile.fromMap(doc.data(), doc.id);
          if (profile.isApproved) {
            results.add(profile);
          }
        } catch (_) {}
      }
      return results;
    });
  }
}
