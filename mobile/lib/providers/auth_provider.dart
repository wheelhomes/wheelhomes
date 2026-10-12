import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../core/auth_error_helper.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();

  User? _user;
  UserProfile? _userProfile;
  StreamSubscription<UserProfile?>? _profileSubscription;
  bool _isLoading = false;
  String? _errorMessage;

  User? get user => _user;
  UserProfile? get userProfile => _userProfile;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _user != null;

  AuthProvider() {
    _authService.authStateChanges.listen((user) async {
      _user = user;
      _profileSubscription?.cancel();
      if (user != null) {
        _profileSubscription = _authService.userProfileStream(user.uid).listen((profile) {
          _userProfile = profile;
          notifyListeners();
        });
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
        await fetchProfile(creds.user!.uid);
      }
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(AuthErrorHelper.format(e));
      _setLoading(false);
      return false;
    }
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
        await fetchProfile(creds.user!.uid);
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

  Future<void> selectRole(String role) async {
    if (_user == null) return;
    _setLoading(true);
    try {
      await _authService.updateUserRole(_user!.uid, role);
      await fetchProfile(_user!.uid);
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
    await _authService.signOut();
    _user = null;
    _userProfile = null;
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
