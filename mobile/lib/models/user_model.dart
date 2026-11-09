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
    final appData = map['applicationData'] is Map
        ? Map<String, dynamic>.from(map['applicationData'])
        : null;

    Map<String, dynamic>? parsedAddress;
    if (map['address'] is Map) {
      parsedAddress = Map<String, dynamic>.from(map['address']);
    } else if (map['address'] is String && (map['address'] as String).trim().isNotEmpty) {
      parsedAddress = {'address': (map['address'] as String).trim()};
    }

    final rawName = (map['fullName'] ??
            map['displayName'] ??
            map['name'] ??
            appData?['fullName'] ??
            map['businessName'] ??
            '')
        .toString()
        .trim();

    final rawPhone = (map['phone'] ??
            map['phoneNumber'] ??
            appData?['phone'] ??
            appData?['phoneNumber'] ??
            '')
        .toString()
        .trim();

    final rawRole = (map['role'] ?? appData?['role'] ?? 'pending_role_selection')
        .toString()
        .trim()
        .toLowerCase();

    final rawStatus = (map['status'] ?? 'unverified')
        .toString()
        .trim()
        .toLowerCase();

    return UserProfile(
      uid: id,
      email: (map['email'] ?? appData?['email'] ?? '').toString().trim(),
      fullName: rawName,
      phone: rawPhone,
      businessName: map['businessName']?.toString() ?? appData?['businessName']?.toString(),
      role: rawRole,
      status: rawStatus,
      rejectionReason: map['rejectionReason']?.toString(),
      emailVerified: map['emailVerified'] == true ||
          rawStatus == 'verified' ||
          rawStatus == 'pending_review' ||
          rawStatus == 'approved' ||
          (rawRole.isNotEmpty && rawRole != 'pending_role_selection' && map['verificationOtp'] == null),
      address: parsedAddress,
      applicationData: appData,
      rawData: map,
      createdAt: map['createdAt'] != null
          ? map['createdAt'].toString()
          : DateTime.now().toIso8601String(),
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

  // Resilient getters: Top-level updated fields (`rawData` & `hodDepartments`) take priority
  // over initial onboarding snapshot (`applicationData`) so Admin & Provider updates show immediately.
  static String? _firstNonEmpty(List<dynamic> candidates) {
    for (final c in candidates) {
      if (c != null) {
        final s = c.toString().trim();
        if (s.isNotEmpty) return s;
      }
    }
    return null;
  }

  String? get govIdUrl => _firstNonEmpty([
        rawData['govIdUrl'],
        rawData['govIdPhoto'],
        applicationData?['govIdUrl'],
        applicationData?['govIdPhoto'],
      ]);

  String? get passportUrl => _firstNonEmpty([
        rawData['passportUrl'],
        rawData['passportPhoto'],
        rawData['photoURL'],
        rawData['photoUrl'],
        rawData['avatarUrl'],
        rawData['avatar'],
        applicationData?['passportUrl'],
        applicationData?['passportPhoto'],
      ]);

  String? get idType => _firstNonEmpty([
        rawData['idType'],
        applicationData?['idType'],
      ]);

  String? get bio => _firstNonEmpty([
        rawData['bio'],
        rawData['description'],
        applicationData?['bio'],
        applicationData?['description'],
      ]);

  String? get serviceCategory {
    String? hodCat;
    final hodDepts = rawData['hodDepartments'];
    if (hodDepts is List && hodDepts.isNotEmpty && hodDepts.first is Map) {
      hodCat = (hodDepts.first as Map)['categoryName']?.toString();
    }
    final topServices = rawData['services'] is List && (rawData['services'] as List).isNotEmpty
        ? (rawData['services'] as List).first
        : null;
    final appServices = applicationData?['services'] is List && (applicationData!['services'] as List).isNotEmpty
        ? (applicationData!['services'] as List).first
        : null;

    return _firstNonEmpty([
      rawData['serviceCategory'],
      hodCat,
      rawData['tradeCategory'],
      rawData['primaryService'],
      topServices,
      rawData['category'],
      rawData['profession'],
      applicationData?['serviceCategory'],
      applicationData?['primaryService'],
      appServices,
    ]);
  }

  String? get experience => _firstNonEmpty([
        rawData['experience'],
        rawData['experienceYears'],
        applicationData?['experience'],
        applicationData?['experienceYears'],
      ]);

  String? get coverageArea {
    String? hodState;
    final hodDepts = rawData['hodDepartments'];
    if (hodDepts is List && hodDepts.isNotEmpty && hodDepts.first is Map) {
      hodState = (hodDepts.first as Map)['stateName']?.toString();
    }
    final locStr = rawData['location'] is String ? rawData['location'] : null;
    return _firstNonEmpty([
      rawData['coverageArea'],
      rawData['state'],
      hodState,
      rawData['city'],
      address?['state'],
      address?['city'],
      address?['address'],
      locStr,
      applicationData?['coverageArea'],
      applicationData?['state'],
      applicationData?['city'],
      applicationData?['location'],
    ]);
  }

  List<String> get jobPhotos {
    final list = rawData['jobPhotos'] ?? rawData['workPhotos'] ?? applicationData?['jobPhotos'];
    if (list is List) {
      return list.map((e) => e.toString()).where((s) => s.trim().isNotEmpty).toList();
    }
    return [];
  }

  double get rating => (rawData['rating'] != null ? double.tryParse('${rawData['rating']}') : null) ?? 4.9;
  int get reviewCount => (rawData['reviewCount'] != null ? int.tryParse('${rawData['reviewCount']}') : null) ?? 0;
}
