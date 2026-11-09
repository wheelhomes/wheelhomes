class ServiceRequestModel {
  final String id;
  final String userId;
  final String serviceType;
  final String description;
  final Map<String, dynamic> location;
  final double? price;
  final String status; // 'pending' | 'accepted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  final String createdAt;
  final String? providerId;
  final List<String> images;
  final String paymentStatus; // 'unpaid' | 'escrow_held' | 'released'
  final double? clientRating;
  final String? clientReview;
  final String? clientName;
  final String? actualEndTime;

  // HOD Smart Routing & Field Assistant Dispatch
  final String? hodId;
  final String? hodName;
  final String? hodPhone;
  final String? clientState;
  final String? preferredTime;
  final String? assistantName;
  final String? assistantPhone;
  final String? assistantArea;
  final bool clientApproved;
  final String? clientApprovedAt;
  final double? initialBudget;
  final double? finalAgreedPrice;
  final String? completionSummary;
  final String? requestCode;
  final String? lastMessage;
  final String? lastMessageSenderId;

  bool get isClientApproved =>
      clientApproved || status.toLowerCase() == 'fully_completed' || status.toLowerCase() == 'completed';

  /// Canonical human-readable Request ID (`WOC-XXXXXX`) matching the Web platform 100%.
  String get displayRequestCode {
    final explicit = (requestCode ?? '').trim();
    if (explicit.isNotEmpty) {
      return explicit.toUpperCase().startsWith('WOC-')
          ? explicit.toUpperCase()
          : 'WOC-${explicit.toUpperCase()}';
    }
    return deriveRequestCodeFromId(id);
  }

  static String deriveRequestCodeFromId(String docId) {
    final clean = docId.trim();
    if (clean.isEmpty) return 'WOC-000000';
    int hash = 0;
    for (int i = 0; i < clean.length; i++) {
      hash = (hash * 31 + clean.codeUnitAt(i)) % 900000;
    }
    final sixDigits = '${(hash % 900000) + 100000}'.padLeft(6, '0');
    return 'WOC-$sixDigits';
  }

  ServiceRequestModel({
    required this.id,
    required this.userId,
    required this.serviceType,
    required this.description,
    required this.location,
    this.price,
    required this.status,
    required this.createdAt,
    this.providerId,
    this.images = const [],
    this.paymentStatus = 'unpaid',
    this.clientRating,
    this.clientReview,
    this.clientName,
    this.actualEndTime,
    this.hodId,
    this.hodName,
    this.hodPhone,
    this.clientState,
    this.preferredTime,
    this.assistantName,
    this.assistantPhone,
    this.assistantArea,
    this.clientApproved = false,
    this.clientApprovedAt,
    this.initialBudget,
    this.finalAgreedPrice,
    this.completionSummary,
    this.requestCode,
    this.lastMessage,
    this.lastMessageSenderId,
  });

  factory ServiceRequestModel.fromMap(Map<String, dynamic> map, String docId) {
    // 1. Resolve Location (Map or String)
    Map<String, dynamic> parsedLocation = {};
    if (map['location'] is Map) {
      parsedLocation = Map<String, dynamic>.from(map['location']);
    } else if (map['location'] is String && (map['location'] as String).isNotEmpty) {
      parsedLocation = {'address': map['location']};
    }

    // 2. Resolve Price / Budget / Final Agreed Price
    final rawFinalPrice = map['finalAgreedPrice'];
    final double? parsedFinalPrice = rawFinalPrice != null ? double.tryParse('$rawFinalPrice') : null;
    final rawInitialBudget = map['initialBudget'];
    final double? parsedInitialBudget = rawInitialBudget != null ? double.tryParse('$rawInitialBudget') : null;
    final rawPrice = map['finalAgreedPrice'] ?? map['price'] ?? map['budget'] ?? map['estimatedBudget'];
    final double? parsedPrice = rawPrice != null ? double.tryParse('$rawPrice') : null;

    // 3. Resolve Images / Photos
    final rawImages = map['images'] ?? map['photos'];
    final List<String> parsedImages = [];
    if (rawImages is List) {
      for (final item in rawImages) {
        if (item != null && item.toString().trim().isNotEmpty) {
          parsedImages.add(item.toString());
        }
      }
    }

    // 4. Resolve CreatedAt
    String parsedCreatedAt = DateTime.now().toIso8601String();
    if (map['createdAt'] is String) {
      parsedCreatedAt = map['createdAt'];
    } else if (map['createdAt'] != null && map['createdAt'].toString().isNotEmpty) {
      parsedCreatedAt = map['createdAt'].toString();
    }

    // 5. Resolve Client Rating & Review
    final rawRating = map['clientRating'] ?? map['rating'];
    final double? parsedRating = rawRating != null ? double.tryParse('$rawRating') : null;
    final String? parsedReview = map['clientReview'] ?? map['review'] ?? map['comment'];
    final String? parsedClientName = map['clientName'] ?? map['userName'] ?? map['customerName'];
    final String? parsedActualEndTime = map['actualEndTime']?.toString();

    // 6. Resolve HOD & Assigned Assistant
    final assignedAst = map['assignedAssistant'] is Map
        ? Map<String, dynamic>.from(map['assignedAssistant'])
        : null;

    return ServiceRequestModel(
      id: docId,
      userId: (map['userId'] ?? map['clientId'] ?? '').toString(),
      serviceType: (map['serviceType'] ?? map['category'] ?? 'General Repair').toString(),
      description: (map['description'] ?? '').toString(),
      location: parsedLocation,
      price: parsedPrice,
      status: (map['status'] ?? 'pending').toString(),
      createdAt: parsedCreatedAt,
      providerId: map['providerId']?.toString(),
      images: parsedImages,
      paymentStatus: (map['paymentStatus'] ?? 'unpaid').toString(),
      clientRating: parsedRating,
      clientReview: parsedReview,
      clientName: parsedClientName,
      actualEndTime: parsedActualEndTime,
      hodId: map['hodId']?.toString(),
      hodName: map['hodName']?.toString(),
      hodPhone: map['hodPhone']?.toString(),
      clientState: map['clientState']?.toString(),
      preferredTime: map['preferredTime']?.toString(),
      assistantName: (map['assistantName'] ?? assignedAst?['name'])?.toString(),
      assistantPhone: (map['assistantPhone'] ?? assignedAst?['phone'])?.toString(),
      assistantArea: (map['assistantArea'] ?? assignedAst?['area'])?.toString(),
      clientApproved: map['clientApproved'] == true,
      clientApprovedAt: map['clientApprovedAt']?.toString(),
      initialBudget: parsedInitialBudget,
      finalAgreedPrice: parsedFinalPrice,
      completionSummary: (map['completionSummary'] ?? map['completionNote'])?.toString(),
      requestCode: (map['requestCode'] ?? map['trackingId'])?.toString(),
      lastMessage: map['lastMessage']?.toString(),
      lastMessageSenderId: map['lastMessageSenderId']?.toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      if (requestCode != null) 'requestCode': requestCode,
      if (requestCode != null) 'trackingId': requestCode,
      'userId': userId,
      'clientId': userId,
      'serviceType': serviceType,
      'description': description,
      'location': location,
      if (price != null) 'price': price,
      if (price != null) 'budget': price,
      if (initialBudget != null) 'initialBudget': initialBudget,
      if (finalAgreedPrice != null) 'finalAgreedPrice': finalAgreedPrice,
      if (completionSummary != null) 'completionSummary': completionSummary,
      'status': status,
      'createdAt': createdAt,
      if (providerId != null) 'providerId': providerId,
      'images': images,
      'photos': images,
      'paymentStatus': paymentStatus,
      if (clientRating != null) 'clientRating': clientRating,
      if (clientReview != null) 'clientReview': clientReview,
      if (clientName != null) 'clientName': clientName,
      if (actualEndTime != null) 'actualEndTime': actualEndTime,
      if (hodId != null) 'hodId': hodId,
      if (hodName != null) 'hodName': hodName,
      if (hodPhone != null) 'hodPhone': hodPhone,
      if (clientState != null) 'clientState': clientState,
      if (preferredTime != null) 'preferredTime': preferredTime,
      if (assistantName != null) 'assistantName': assistantName,
      if (assistantPhone != null) 'assistantPhone': assistantPhone,
      if (assistantArea != null) 'assistantArea': assistantArea,
      'clientApproved': clientApproved,
      if (clientApprovedAt != null) 'clientApprovedAt': clientApprovedAt,
    };
  }
}
