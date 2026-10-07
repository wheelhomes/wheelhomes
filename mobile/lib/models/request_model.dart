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
  });

  factory ServiceRequestModel.fromMap(Map<String, dynamic> map, String docId) {
    return ServiceRequestModel(
      id: docId,
      userId: map['userId'] ?? '',
      serviceType: map['serviceType'] ?? 'General Repair',
      description: map['description'] ?? '',
      location: map['location'] != null ? Map<String, dynamic>.from(map['location']) : {},
      price: map['price'] != null ? double.tryParse('${map['price']}') : null,
      status: map['status'] ?? 'pending',
      createdAt: map['createdAt'] is String 
          ? map['createdAt'] 
          : DateTime.now().toIso8601String(),
      providerId: map['providerId'],
      images: map['images'] != null ? List<String>.from(map['images']) : const [],
      paymentStatus: map['paymentStatus'] ?? 'unpaid',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'serviceType': serviceType,
      'description': description,
      'location': location,
      if (price != null) 'price': price,
      'status': status,
      'createdAt': createdAt,
      if (providerId != null) 'providerId': providerId,
      'images': images,
      'paymentStatus': paymentStatus,
    };
  }
}
