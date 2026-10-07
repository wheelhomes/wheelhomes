import 'dart:io';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();

  User? _user;
  UserProfile? _userProfile;
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
      if (user != null) {
        await fetchProfile(user.uid);
      } else {
        _userProfile = null;
      }
      notifyListeners();
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
      _setError(e.toString());
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
      _setError(e.toString());
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
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> submitKycVerification({
    required String idType,
    required File govIdFile,
    required File passportFile,
    List<File> jobPhotoFiles = const [],
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
        jobPhotoFiles: jobPhotoFiles,
        bio: bio,
        serviceCategory: serviceCategory,
      );
      await fetchProfile(_user!.uid);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  Future<void> fetchProfile(String uid) async {
    try {
      _userProfile = await _authService.getUserProfile(uid);
      notifyListeners();
    } catch (e) {
      print('Error fetching user profile: $e');
    }
  }

  Future<void> signOut() async {
    await _authService.signOut();
    _user = null;
    _userProfile = null;
    notifyListeners();
  }

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }

  void _setError(String msg) {
    _errorMessage = msg;
    notifyListeners();
  }

  void _clearError() {
    _errorMessage = null;
  }
}
