class ServiceRequestModel {
  final String id;
  final String userId;
  final String serviceType;
  final String description;
  final Map<String, dynamic> location;
  final double? price;
  final String status; // 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  final String createdAt;
  final String? providerId;
  final List<String> images;
  final String paymentStatus; // 'unpaid' | 'escrow_held' | 'released'
  final double? clientRating;
  final String? clientReview;
  final String? clientName;
  final String? actualEndTime;

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
  });

  factory ServiceRequestModel.fromMap(Map<String, dynamic> map, String docId) {
    // 1. Resolve Location (Map or String)
    Map<String, dynamic> parsedLocation = {};
    if (map['location'] is Map) {
      parsedLocation = Map<String, dynamic>.from(map['location']);
    } else if (map['location'] is String && (map['location'] as String).isNotEmpty) {
      parsedLocation = {'address': map['location']};
    }

    // 2. Resolve Price / Budget
    final rawPrice = map['price'] ?? map['budget'] ?? map['estimatedBudget'];
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

    return ServiceRequestModel(
      id: docId,
      userId: (map['userId'] ?? map['clientId'] ?? '').toString(),
      serviceType: (map['serviceType'] ?? map['category'] ?? 'General Repair').toString(),
      description: (map['description'] ?? '').toString(),
      location: parsedLocation,
      price: parsedPrice,
      status: (map['status'] ?? 'open').toString(),
      createdAt: parsedCreatedAt,
      providerId: map['providerId']?.toString(),
      images: parsedImages,
      paymentStatus: (map['paymentStatus'] ?? 'unpaid').toString(),
      clientRating: parsedRating,
      clientReview: parsedReview,
      clientName: parsedClientName,
      actualEndTime: parsedActualEndTime,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'clientId': userId,
      'serviceType': serviceType,
      'description': description,
      'location': location,
      if (price != null) 'price': price,
      if (price != null) 'budget': price,
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
    };
  }
}
