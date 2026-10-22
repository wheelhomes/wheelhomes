import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';
import 'storage_service.dart';
import 'email_service.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final StorageService _storageService = StorageService();

  User? get currentUser => _auth.currentUser;
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // Sign In
  Future<UserCredential> signInWithEmail({
    required String email,
    required String password,
  }) async {
    return await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password.trim(),
    );
  }

  // Sign Up
  Future<UserCredential> signUpWithEmail({
    required String email,
    required String password,
    required String fullName,
    required String phone,
  }) async {
    final cleanEmail = email.trim();
    final cleanName = fullName.trim();
    final cleanPhone = phone.trim();

    final credential = await _auth.createUserWithEmailAndPassword(
      email: cleanEmail,
      password: password.trim(),
    );

    if (credential.user != null) {
      final uid = credential.user!.uid;

      if (cleanName.isNotEmpty) {
        credential.user!.updateDisplayName(cleanName).catchError((_) {});
      }

      final userProfile = UserProfile(
        uid: uid,
        email: cleanEmail,
        fullName: cleanName,
        phone: cleanPhone,
        role: 'pending_role_selection',
        status: 'unverified',
        createdAt: DateTime.now().toIso8601String(),
      );

      await _firestore
          .collection('users')
          .doc(uid)
          .set(userProfile.toMap());

      // Dispatch secure instant verification email via backend
      EmailService.requestVerificationOtp().catchError((e) {
        debugPrint('[AuthService] Could not request verification email: $e');
        return false;
      });
    }

    return credential;
  }

  // Verify 6-digit OTP code securely via backend API
  Future<bool> verifyEmailOtp({
    required String uid,
    required String code,
  }) async {
    final cleanCode = code.trim().replaceAll(' ', '');
    final success = await EmailService.verifyOtp(code: cleanCode);
    if (!success) {
      throw Exception('Incorrect or expired verification code. Please check your email.');
    }
    // Also persist verification in Firestore directly from client SDK
    try {
      await _firestore.collection('users').doc(uid).set({
        'status': 'verified',
        'verifiedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (_) {}
    return true;
  }

  // Resend 6-digit verification code securely via backend API
  Future<bool> resendVerificationOtp({
    required String uid,
    required String email,
    required String name,
  }) async {
    return await EmailService.requestVerificationOtp(
      email: email,
      name: name,
    );
  }

  // Fetch User Profile
  Future<UserProfile?> getUserProfile(String uid) async {
    final doc = await _firestore.collection('users').doc(uid).get();
    if (doc.exists && doc.data() != null) {
      return UserProfile.fromMap(doc.data()!, doc.id);
    }
    return null;
  }

  // Update Role
  Future<void> updateUserRole(String uid, String role) async {
    await _firestore.collection('users').doc(uid).set({
      'role': role,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }



  // Real-time User Profile Stream
  Stream<UserProfile?> userProfileStream(String uid) {
    return _firestore.collection('users').doc(uid).snapshots().map((doc) {
      if (doc.exists && doc.data() != null) {
        return UserProfile.fromMap(doc.data()!, doc.id);
      }
      return null;
    });
  }

  // Upload and Submit KYC Identity Verification Documents + Trade & Job Photos
  Future<void> submitKycDocuments({
    required String uid,
    required String idType,
    File? govIdFile,
    File? passportFile,
    String? existingGovIdUrl,
    String? existingPassportUrl,
    List<File> jobPhotoFiles = const [],
    List<String> existingJobPhotoUrls = const [],
    String? bio,
    String? serviceCategory,
    String? experience,
    String? coverageArea,
  }) async {
    // 1. Concurrently upload new files or preserve existing valid URLs
    Future<String> resolveGovId() async {
      if (govIdFile != null) {
        return await _storageService.uploadLocalFile(
          file: govIdFile,
          storagePath: 'provider_docs/$uid/gov_id.jpg',
          folder: 'wheelhomes/provider_docs',
        );
      }
      if (existingGovIdUrl != null && existingGovIdUrl.isNotEmpty) {
        return existingGovIdUrl;
      }
      throw Exception('Government ID document is required.');
    }

    Future<String> resolvePassport() async {
      if (passportFile != null) {
        return await _storageService.uploadLocalFile(
          file: passportFile,
          storagePath: 'provider_docs/$uid/passport.jpg',
          folder: 'wheelhomes/provider_docs',
        );
      }
      if (existingPassportUrl != null && existingPassportUrl.isNotEmpty) {
        return existingPassportUrl;
      }
      throw Exception('Passport photograph is required.');
    }

    final jobFutures = <Future<String>>[];
    for (int i = 0; i < jobPhotoFiles.length; i++) {
      jobFutures.add(_storageService.uploadLocalFile(
        file: jobPhotoFiles[i],
        storagePath: 'provider_docs/$uid/job_photos/proof_${DateTime.now().millisecondsSinceEpoch}_$i.jpg',
        folder: 'wheelhomes/job_photos',
      ));
    }

    final results = await Future.wait([
      resolveGovId(),
      resolvePassport(),
      ...jobFutures,
    ]);

    final govIdUrl = results[0];
    final passportUrl = results[1];
    final newJobPhotoUrls = results.sublist(2);
    final combinedJobPhotos = [...existingJobPhotoUrls, ...newJobPhotoUrls];

    final now = DateTime.now().toIso8601String();
    final cleanCategory = (serviceCategory != null && serviceCategory.trim().isNotEmpty)
        ? serviceCategory.trim()
        : 'General Maintenance';
    final cleanBio = (bio != null && bio.trim().isNotEmpty) ? bio.trim() : '';
    final cleanExperience = (experience != null && experience.trim().isNotEmpty) ? experience.trim() : '';
    final cleanCoverage = (coverageArea != null && coverageArea.trim().isNotEmpty) ? coverageArea.trim() : '';

    // 2. Save Document details in subcollections
    try {
      await _firestore.collection('users').doc(uid).collection('documents').doc('govId').set({
        'data': govIdUrl,
        'type': 'govId',
        'idType': idType,
        'uploadedAt': now,
        'mimeType': 'image/jpeg',
      });

      await _firestore.collection('users').doc(uid).collection('documents').doc('passport').set({
        'data': passportUrl,
        'type': 'passport',
        'uploadedAt': now,
        'mimeType': 'image/jpeg',
      });

      if (combinedJobPhotos.isNotEmpty) {
        await _firestore.collection('users').doc(uid).collection('documents').doc('jobPhotos').set({
          'photos': combinedJobPhotos,
          'count': combinedJobPhotos.length,
          'uploadedAt': now,
        });
      }
    } catch (e) {
      debugPrint('[AuthService] Documents subcollection notice: $e');
    }

    // 3. Check if user is currently approved to prevent demoting approved status on update
    String resolvedStatus = 'pending_review';
    try {
      final docSnap = await _firestore.collection('users').doc(uid).get();
      if (docSnap.exists && docSnap.data()?['status'] == 'approved') {
        resolvedStatus = 'approved';
      }
    } catch (_) {}

    // 4. Update main User Profile (uses set with merge: true to guarantee no NOT_FOUND error)
    await _firestore.collection('users').doc(uid).set({
      'status': resolvedStatus,
      'rejectionReason': null,
      'rejectedDocs': [],
      'bio': cleanBio,
      'description': cleanBio,
      'serviceCategory': cleanCategory,
      'services': [cleanCategory],
      'experience': cleanExperience,
      'coverageArea': cleanCoverage,
      'idType': idType,
      'jobPhotos': combinedJobPhotos,
      'govIdUrl': govIdUrl,
      'passportUrl': passportUrl,
      'photoURL': passportUrl,
      'kycSubmittedAt': now,
      'applicationData': {
        'idType': idType,
        'govIdUrl': govIdUrl,
        'passportUrl': passportUrl,
        'jobPhotos': combinedJobPhotos,
        'bio': cleanBio,
        'description': cleanBio,
        'serviceCategory': cleanCategory,
        'primaryService': cleanCategory,
        'services': [cleanCategory],
        'experience': cleanExperience,
        'coverageArea': cleanCoverage,
        'submittedAt': now,
        'hasDocuments': true,
      },
    }, SetOptions(merge: true));

    // 5. In-App Notification (only if submitting for initial review)
    if (resolvedStatus != 'approved') {
      try {
        await _firestore.collection('notifications').add({
          'userId': uid,
          'recipientId': uid,
          'title': 'Onboarding Successful 🎉',
          'message': 'Your onboarding documents have been submitted. Your account is currently under pending review.',
          'body': 'Your onboarding documents have been submitted. Your account is currently under pending review.',
          'type': 'info',
          'read': false,
          'isRead': false,
          'createdAt': now,
          'link': '/dashboard/pending',
        });
      } catch (_) {}

      // 6. Dispatch confirmation email to user via Brevo HTTPS REST API (initial onboarding only)
      try {
        String? candidateEmail = currentUser?.email;
        String? candidateName = currentUser?.displayName;

        try {
          final userDoc = await _firestore.collection('users').doc(uid).get();
          if (userDoc.exists) {
            final data = userDoc.data();
            if (candidateEmail == null || candidateEmail.isEmpty) {
              candidateEmail = data?['email'];
            }
            if (candidateName == null || candidateName.isEmpty) {
              candidateName = data?['fullName'] ?? data?['displayName'] ?? data?['businessName'] ?? data?['name'];
            }
          }
        } catch (_) {}

        if (candidateEmail != null && candidateEmail.isNotEmpty) {
          EmailService.sendPendingReviewNotification(
            email: candidateEmail,
            name: candidateName ?? 'Valued Partner',
            uid: uid,
          );
        }
      } catch (e) {
        debugPrint('[AuthService] ⚠️ Could not dispatch pending review email: $e');
      }
    }
  }

  /// Updates only the provider's passport photograph/avatar and synchronizes across Web & Mobile
  Future<String> updatePassportPhoto({
    required String uid,
    required File imageFile,
  }) async {
    final downloadUrl = await _storageService.uploadLocalFile(
      file: imageFile,
      storagePath: 'provider_docs/$uid/passport_${DateTime.now().millisecondsSinceEpoch}.jpg',
      folder: 'wheelhomes/provider_docs',
    );
    final now = DateTime.now().toIso8601String();

    await _firestore.collection('users').doc(uid).set({
      'passportUrl': downloadUrl,
      'photoURL': downloadUrl,
      'applicationData': {
        'passportUrl': downloadUrl,
      },
      'updatedAt': now,
    }, SetOptions(merge: true));

    try {
      await _firestore.collection('users').doc(uid).collection('documents').doc('passport').set({
        'data': downloadUrl,
        'type': 'passport',
        'uploadedAt': now,
        'mimeType': 'image/jpeg',
      }, SetOptions(merge: true));
    } catch (e) {
      debugPrint('[AuthService] Documents passport notice: $e');
    }

    return downloadUrl;
  }

  // Sign Out
  Future<void> signOut() async {
    await _auth.signOut();
  }

  // Password Reset
  Future<void> sendPasswordResetEmail(String email) async {
    await _auth.sendPasswordResetEmail(email: email.trim());
  }
}
