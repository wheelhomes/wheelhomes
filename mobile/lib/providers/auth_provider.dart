import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/pin_lock_service.dart';
import '../core/auth_error_helper.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();

  User? _user;
  UserProfile? _userProfile;
  StreamSubscription<UserProfile?>? _profileSubscription;
  bool _isLoading = false;
  bool _isAuthReady = false;
  String? _errorMessage;
  bool _isEmailVerifiedLocally = false;

  User? get user => _user;
  UserProfile? get userProfile => _userProfile;
  bool get isLoading => _isLoading;
  bool get isAuthReady => _isAuthReady;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _user != null;
  bool get isEmailVerified =>
      _isEmailVerifiedLocally ||
      (_user?.emailVerified == true) ||
      (_userProfile?.isEmailVerifiedGlobally == true);

  AuthProvider() {
    final initialUser = _authService.currentUser;
    if (initialUser != null) {
      _user = initialUser;
      _isAuthReady = true;
      fetchProfile(initialUser.uid);
    }
    _authService.authStateChanges.listen((user) async {
      _user = user;
      _isAuthReady = true;
      _profileSubscription?.cancel();
      if (user != null) {
        notifyListeners();
        fetchProfile(user.uid);
        _profileSubscription = _authService.userProfileStream(user.uid).listen(
          (profile) {
            if (profile != null) {
              _userProfile = profile;
              notifyListeners();
            }
          },
          onError: (e) {
            debugPrint('[AuthProvider] Profile stream error: $e');
            notifyListeners();
          },
        );
      } else {
        _userProfile = null;
        notifyListeners();
      }
    });
  }

  Future<bool> signIn(String email, String password) async {
    _setLoading(true);
    _clearError();
    try {
      final creds = await _authService.signInWithEmail(email: email, password: password);
      if (creds.user != null) {
        _user = creds.user;
        await fetchProfile(creds.user!.uid);
        await PinLockService.saveCredentials(
          uid: creds.user!.uid,
          email: email.trim(),
          password: password.trim(),
          name: _userProfile?.fullName ?? creds.user!.displayName ?? '',
        );
      }
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(AuthErrorHelper.format(e));
      _setLoading(false);
      return false;
    }
  }

  /// Silently restores the Firebase session after a valid PIN / Biometric unlock
  /// if the underlying Firebase Auth token was not yet loaded on cold start.
  Future<bool> restoreSessionAfterPinUnlock({
    String? email,
    String? password,
  }) async {
    if (_user != null) return true;
    final current = _authService.currentUser;
    if (current != null) {
      _user = current;
      notifyListeners();
      await fetchProfile(current.uid);
      return true;
    }
    String targetEmail = (email ?? '').trim();
    String targetPass = password ?? '';
    if (targetEmail.isEmpty || targetPass.isEmpty) {
      final saved = await PinLockService.getSavedCredentials();
      if (targetEmail.isEmpty) targetEmail = (saved['email'] ?? '').trim();
      if (targetPass.isEmpty) targetPass = saved['password'] ?? '';
    }
    if (targetEmail.isNotEmpty && targetPass.isNotEmpty) {
      try {
        final creds = await _authService.signInWithEmail(
          email: targetEmail,
          password: targetPass,
        );
        if (creds.user != null) {
          _user = creds.user;
          notifyListeners();
          await fetchProfile(creds.user!.uid);
          return true;
        }
      } catch (e) {
        debugPrint('[AuthProvider] Silent PIN session restore note: $e');
      }
    }
    return _user != null;
  }

  Future<bool> signUp({
    required String email,
    required String password,
    required String fullName,
    required String phone,
  }) async {
    _setLoading(true);
    _clearError();
    try {
      final creds = await _authService.signUpWithEmail(
        email: email,
        password: password,
        fullName: fullName,
        phone: phone,
      );
      if (creds.user != null) {
        _user = creds.user;
        await fetchProfile(creds.user!.uid);
        await PinLockService.saveCredentials(
          uid: creds.user!.uid,
          email: email.trim(),
          password: password.trim(),
          name: fullName.trim(),
        );
      }
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(AuthErrorHelper.format(e));
      _setLoading(false);
      return false;
    }
  }

  Future<bool> sendPasswordReset(String email) async {
    _setLoading(true);
    _clearError();
    try {
      await _authService.sendPasswordResetEmail(email);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(AuthErrorHelper.format(e));
      _setLoading(false);
      return false;
    }
  }

  Future<bool> verifyEmailOtp(String code) async {
    if (_user == null) return false;
    _setLoading(true);
    _clearError();
    try {
      final success = await _authService.verifyEmailOtp(uid: _user!.uid, code: code);
      if (success) {
        _isEmailVerifiedLocally = true;
        if (_userProfile != null) {
          _userProfile = UserProfile.fromMap({
            ..._userProfile!.rawData,
            'emailVerified': true,
            if (_userProfile!.status == 'unverified') 'status': 'verified',
          }, _user!.uid);
        }
        try {
          await _user?.reload();
          _user = FirebaseAuth.instance.currentUser;
        } catch (_) {}
        await fetchProfile(_user!.uid);
        notifyListeners();
      }
      _setLoading(false);
      return success;
    } catch (e) {
      _setError(AuthErrorHelper.format(e));
      _setLoading(false);
      return false;
    }
  }

  Future<bool> checkEmailVerified() async {
    if (_user == null) return false;
    if (_isEmailVerifiedLocally) return true;
    try {
      await _user!.reload();
      final freshUser = FirebaseAuth.instance.currentUser;
      _user = freshUser;
      if (freshUser != null && freshUser.emailVerified) {
        await fetchProfile(freshUser.uid);
        notifyListeners();
        return true;
      }
      await fetchProfile(_user!.uid);
      if (_userProfile?.isEmailVerifiedGlobally == true) {
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('[AuthProvider] checkEmailVerified error: $e');
      return false;
    }
  }

  Future<bool> resendVerificationOtp() async {
    if (_user == null) return false;
    _setLoading(true);
    _clearError();
    try {
      UserProfile? profile = _userProfile;
      if (profile == null || profile.fullName.trim().isEmpty) {
        profile = await _authService.getUserProfile(_user!.uid);
        if (profile != null) _userProfile = profile;
      }
      final resolvedName = (profile?.fullName.trim().isNotEmpty ?? false)
          ? profile!.fullName.trim()
          : (_user!.displayName?.trim().isNotEmpty ?? false)
              ? _user!.displayName!.trim()
              : '';
      final resolvedEmail = profile?.email ?? _user!.email ?? '';

      // 1. Dispatch custom transactional email verification OTP via backend
      bool otpSent = false;
      try {
        otpSent = await _authService.resendVerificationOtp(
          uid: _user!.uid,
          email: resolvedEmail,
          name: resolvedName,
        );
      } catch (backendErr) {
        debugPrint('[AuthProvider] Backend OTP dispatch note: $backendErr');
      }

      // 2. Always dispatch Firebase native email verification link as resilient fallback
      bool nativeSent = false;
      try {
        await _user!.sendEmailVerification();
        nativeSent = true;
        debugPrint('[AuthProvider] Native Firebase email verification link dispatched.');
      } catch (nativeErr) {
        debugPrint('[AuthProvider] Native Firebase email link error: $nativeErr');
      }

      _setLoading(false);
      if (otpSent || nativeSent) {
        return true;
      }
      _setError('Failed to dispatch verification email. Please check your internet connection.');
      return false;
    } catch (e) {
      _setError(AuthErrorHelper.format(e));
      _setLoading(false);
      return false;
    }
  }

  Future<void> selectRole(String role) async {
    if (_user == null) return;
    _setLoading(true);
    try {
      await _authService.updateUserRole(_user!.uid, role);
      if (_userProfile != null) {
        _userProfile = UserProfile.fromMap({
          ..._userProfile!.rawData,
          'role': role,
        }, _user!.uid);
      }
      await fetchProfile(_user!.uid);
      notifyListeners();
    } catch (e) {
      _setError(AuthErrorHelper.format(e));
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> submitKycVerification({
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
    if (_user == null) return false;
    _setLoading(true);
    _clearError();
    try {
      await _authService.submitKycDocuments(
        uid: _user!.uid,
        idType: idType,
        govIdFile: govIdFile,
        passportFile: passportFile,
        existingGovIdUrl: existingGovIdUrl,
        existingPassportUrl: existingPassportUrl,
        jobPhotoFiles: jobPhotoFiles,
        existingJobPhotoUrls: existingJobPhotoUrls,
        bio: bio,
        serviceCategory: serviceCategory,
        experience: experience,
        coverageArea: coverageArea,
      );
      await fetchProfile(_user!.uid);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(AuthErrorHelper.format(e));
      _setLoading(false);
      return false;
    }
  }

  Future<bool> updatePassportPhoto(File imageFile) async {
    if (_user == null) return false;
    _setLoading(true);
    _clearError();
    try {
      await _authService.updatePassportPhoto(
        uid: _user!.uid,
        imageFile: imageFile,
      );
      await fetchProfile(_user!.uid);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(AuthErrorHelper.format(e));
      _setLoading(false);
      return false;
    }
  }

  Future<void> fetchProfile(String uid) async {
    try {
      _userProfile = await _authService.getUserProfile(uid);
      notifyListeners();
    } catch (e) {
      debugPrint('Error fetching user profile: $e');
    }
  }

  Future<void> signOut() async {
    _profileSubscription?.cancel();
    _profileSubscription = null;
    // Signing out removes this device's login PIN, so the next login must use
    // email and password.
    await PinLockService.clear();
    await _authService.signOut();
    _user = null;
    _userProfile = null;
    _isEmailVerifiedLocally = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _profileSubscription?.cancel();
    super.dispose();
  }

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  void _setError(String msg) {
    _errorMessage = msg;
    notifyListeners();
  }

  void clearError() {
    _clearError();
    notifyListeners();
  }

  void _clearError() {
    _errorMessage = null;
  }
}
