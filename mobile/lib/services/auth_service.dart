import 'dart:io';
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
    final credential = await _auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password.trim(),
    );

    if (credential.user != null) {
      final userProfile = UserProfile(
        uid: credential.user!.uid,
        email: email.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        role: 'pending_role_selection',
        status: 'unverified',
        createdAt: DateTime.now().toIso8601String(),
      );

      await _firestore
          .collection('users')
          .doc(credential.user!.uid)
          .set(userProfile.toMap());
    }

    return credential;
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
    // Only regular users are automatically approved without KYC.
    // Service providers, agents, and users resetting role stay 'unverified'.
    final status = (role == 'user') ? 'approved' : 'unverified';

    await _firestore.collection('users').doc(uid).update({
      'role': role,
      'status': status,
    });
  }



  // Upload and Submit KYC Identity Verification Documents + Trade & Job Photos
  Future<void> submitKycDocuments({
    required String uid,
    required String idType,
    required File govIdFile,
    required File passportFile,
    List<File> jobPhotoFiles = const [],
    String? bio,
    String? serviceCategory,
  }) async {
    // 1. Parallel Cloud Upload (All files upload concurrently in < 3 seconds)
    final govIdFuture = _storageService.uploadLocalFile(
      file: govIdFile,
      storagePath: 'provider_docs/$uid/gov_id.jpg',
      folder: 'wheelhomes/provider_docs',
    );
    final passportFuture = _storageService.uploadLocalFile(
      file: passportFile,
      storagePath: 'provider_docs/$uid/passport.jpg',
      folder: 'wheelhomes/provider_docs',
    );

    final jobFutures = <Future<String>>[];
    for (int i = 0; i < jobPhotoFiles.length; i++) {
      jobFutures.add(_storageService.uploadLocalFile(
        file: jobPhotoFiles[i],
        storagePath: 'provider_docs/$uid/job_photos/proof_$i.jpg',
        folder: 'wheelhomes/job_photos',
      ));
    }

    final results = await Future.wait([
      govIdFuture,
      passportFuture,
      ...jobFutures,
    ]);

    final govIdUrl = results[0];
    final passportUrl = results[1];
    final jobPhotoUrls = results.sublist(2);

    final now = DateTime.now().toIso8601String();
    final cleanCategory = (serviceCategory != null && serviceCategory.trim().isNotEmpty)
        ? serviceCategory.trim()
        : 'General Maintenance';
    final cleanBio = (bio != null && bio.trim().isNotEmpty) ? bio.trim() : '';

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

      if (jobPhotoUrls.isNotEmpty) {
        await _firestore.collection('users').doc(uid).collection('documents').doc('jobPhotos').set({
          'photos': jobPhotoUrls,
          'count': jobPhotoUrls.length,
          'uploadedAt': now,
        });
      }
    } catch (e) {
      print('[AuthService] Documents subcollection notice: $e');
    }

    // 3. Update main User Profile (uses set with merge: true to guarantee no NOT_FOUND error)
    await _firestore.collection('users').doc(uid).set({
      'status': 'pending_review',
      'bio': cleanBio,
      'description': cleanBio,
      'serviceCategory': cleanCategory,
      'services': [cleanCategory],
      'jobPhotos': jobPhotoUrls,
      'govIdUrl': govIdUrl,
      'passportUrl': passportUrl,
      'kycSubmittedAt': now,
      'applicationData': {
        'idType': idType,
        'govIdUrl': govIdUrl,
        'passportUrl': passportUrl,
        'jobPhotos': jobPhotoUrls,
        'bio': cleanBio,
        'description': cleanBio,
        'serviceCategory': cleanCategory,
        'services': [cleanCategory],
        'submittedAt': now,
        'hasDocuments': true,
      },
    }, SetOptions(merge: true));

    // 4. In-App Notification
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

    // 5. Dispatch confirmation email to user via Brevo HTTPS REST API
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
      print('[AuthService] ⚠️ Could not dispatch pending review email: $e');
    }
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
