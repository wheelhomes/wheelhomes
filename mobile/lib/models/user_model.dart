class UserProfile {
  final String uid;
  final String email;
  final String fullName;
  final String phone;
  final String? businessName;
  final String role; // 'user' | 'service_provider' | 'agent' | 'admin' | 'pending_role_selection'
  final String status; // 'unverified' | 'pending_review' | 'approved' | 'rejected' | 'restricted' | 'verified'
  final String? rejectionReason;
  final bool emailVerified;
  final Map<String, dynamic>? address;
  final Map<String, dynamic>? applicationData;
  final Map<String, dynamic> rawData;
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
    this.emailVerified = false,
    this.address,
    this.applicationData,
    this.rawData = const {},
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
      emailVerified: map['emailVerified'] == true ||
          map['status'] == 'verified' ||
          map['status'] == 'pending_review' ||
          map['status'] == 'approved' ||
          (map['role'] != null && map['role'] != 'pending_role_selection' && map['verificationOtp'] == null),
      address: map['address'] != null ? Map<String, dynamic>.from(map['address']) : null,
      applicationData: map['applicationData'] != null ? Map<String, dynamic>.from(map['applicationData']) : null,
      rawData: map,
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
      'emailVerified': emailVerified,
      if (address != null) 'address': address,
      if (applicationData != null) 'applicationData': applicationData,
      'createdAt': createdAt,
    };
  }

  // Verification Helper Getters
  bool get isEmailVerifiedGlobally => emailVerified;

  // For service providers, strict admin approval ('approved') is required before activation
  bool get isVerified {
    if (role == 'service_provider') {
      return status == 'approved';
    }
    return status == 'approved' || status == 'verified';
  }
  bool get isApproved => status == 'approved';
  bool get isPendingReview => status == 'pending_review' || status == 'pending';
  bool get isUnverified => status == 'unverified' || status.isEmpty;
  bool get isRejected => status == 'rejected' || status == 'restricted' || status == 'suspended';
  bool get isSuspended => status == 'suspended';
  bool get isServiceProvider => role == 'service_provider';
  bool get isAgent => role == 'agent';

  // Resilient fallback getters (ensures 100% parity with web registration and admin console)
  String? get govIdUrl => (applicationData?['govIdUrl'] ?? rawData['govIdUrl'] ?? applicationData?['govIdPhoto'] ?? rawData['govIdPhoto']) as String?;
  String? get passportUrl => (applicationData?['passportUrl'] ?? rawData['passportUrl'] ?? applicationData?['passportPhoto'] ?? rawData['passportPhoto']) as String?;
  String? get idType => (applicationData?['idType'] ?? rawData['idType']) as String?;
  String? get bio => (applicationData?['bio'] ?? rawData['bio'] ?? applicationData?['description'] ?? rawData['description']) as String?;
  String? get serviceCategory => (applicationData?['serviceCategory'] ?? rawData['serviceCategory'] ?? applicationData?['primaryService'] ?? rawData['primaryService'] ?? rawData['category']) as String?;
  String? get experience => (applicationData?['experience'] ?? rawData['experience'])?.toString();
  String? get coverageArea => (applicationData?['coverageArea'] ?? rawData['coverageArea'] ?? rawData['city']) as String?;

  List<String> get jobPhotos {
    final list = applicationData?['jobPhotos'] ?? rawData['jobPhotos'] ?? rawData['workPhotos'];
    if (list is List) {
      return list.map((e) => e.toString()).toList();
    }
    return [];
  }

  double get rating => (rawData['rating'] != null ? double.tryParse('${rawData['rating']}') : null) ?? 4.9;
  int get reviewCount => (rawData['reviewCount'] != null ? int.tryParse('${rawData['reviewCount']}') : null) ?? 0;
}
