class UserProfile {
  final String uid;
  final String email;
  final String fullName;
  final String phone;
  final String? businessName;
  final String role; // 'user' | 'service_provider' | 'agent' | 'admin' | 'pending_role_selection'
  final String status; // 'unverified' | 'pending_review' | 'approved' | 'rejected' | 'restricted' | 'verified'
  final String? rejectionReason;
  final Map<String, dynamic>? address;
  final Map<String, dynamic>? applicationData;
  final String createdAt;

  UserProfile({
    required this.uid,
    required this.email,
    required this.fullName,
    required this.phone,
    this.businessName,
    required this.role,
    required this.status,
    this.rejectionReason,
    this.address,
    this.applicationData,
    required this.createdAt,
  });

  factory UserProfile.fromMap(Map<String, dynamic> map, String id) {
    return UserProfile(
      uid: id,
      email: map['email'] ?? '',
      fullName: map['fullName'] ?? '',
      phone: map['phone'] ?? '',
      businessName: map['businessName'],
      role: map['role'] ?? 'pending_role_selection',
      status: map['status'] ?? 'unverified',
      rejectionReason: map['rejectionReason'] as String?,
      address: map['address'] != null ? Map<String, dynamic>.from(map['address']) : null,
      applicationData: map['applicationData'] != null ? Map<String, dynamic>.from(map['applicationData']) : null,
      createdAt: map['createdAt'] ?? DateTime.now().toIso8601String(),
    );
  }


  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'email': email,
      'fullName': fullName,
      'phone': phone,
      if (businessName != null) 'businessName': businessName,
      'role': role,
      'status': status,
      if (address != null) 'address': address,
      if (applicationData != null) 'applicationData': applicationData,
      'createdAt': createdAt,
    };
  }

  // Verification Helper Getters
  bool get isVerified => status == 'approved' || status == 'verified';
  bool get isPendingReview => status == 'pending_review';
  bool get isUnverified => status == 'unverified' || status.isEmpty;
  bool get isRejected => status == 'rejected' || status == 'restricted';

  String? get govIdUrl => applicationData?['govIdUrl'] as String?;
  String? get passportUrl => applicationData?['passportUrl'] as String?;
  String? get idType => applicationData?['idType'] as String?;
  String? get bio => (applicationData?['bio'] ?? applicationData?['description']) as String?;
  String? get serviceCategory => applicationData?['serviceCategory'] as String?;
  List<String> get jobPhotos {
    final list = applicationData?['jobPhotos'];
    if (list is List) {
      return list.map((e) => e.toString()).toList();
    }
    return [];
  }
}
