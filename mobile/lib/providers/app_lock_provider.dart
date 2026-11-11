import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/widgets.dart';
import '../services/pin_lock_service.dart';

/// Controls the app lock:
/// - A session restored on app launch starts LOCKED (PIN required).
/// - A fresh email/password sign-in starts UNLOCKED (the user just proved who they are).
/// - Returning to the app after [lockAfter] in the background re-locks it.
/// - Signing out clears the PIN, so the next login must use email and password.
class AppLockProvider extends ChangeNotifier with WidgetsBindingObserver {
  static const Duration lockAfter = Duration(minutes: 5);

  StreamSubscription<User?>? _authSub;
  String? _uid;
  bool _ready = false;
  bool _hasPin = false;
  bool _locked = false;
  bool _biometricAvailable = false;
  bool _biometricEnabled = false;
  DateTime? _backgroundedAt;

  bool get isReady => _ready;
  bool get hasPin => _hasPin;
  bool get isLocked => _locked && _hasPin;
  bool get biometricAvailable => _biometricAvailable;
  bool get biometricEnabled => _biometricEnabled;
  String? get uid => _uid;

  AppLockProvider() {
    WidgetsBinding.instance.addObserver(this);
    final current = FirebaseAuth.instance.currentUser;
    if (current != null) {
      // Session restored from a previous launch -> require PIN.
      _uid = current.uid;
      _locked = true;
      _refresh();
    } else {
      _ready = true;
    }
    _authSub = FirebaseAuth.instance.authStateChanges().listen(_onAuthChanged);
  }

  void _onAuthChanged(User? user) {
    if (user == null) {
      if (_uid != null || _hasPin || _locked) {
        _uid = null;
        _hasPin = false;
        _locked = false;
        _biometricEnabled = false;
        _ready = true;
        notifyListeners();
      }
      return;
    }
    if (user.uid != _uid) {
      // Fresh sign-in (or account switch): the user just entered their password.
      _uid = user.uid;
      _locked = false;
      _ready = false;
      notifyListeners();
      _refresh();
    }
  }

  Future<void> _refresh() async {
    final uid = _uid;
    if (uid == null) return;
    final results = await Future.wait([
      PinLockService.hasPin(uid),
      PinLockService.canUseBiometric(),
      PinLockService.isBiometricEnabled(),
    ]);
    if (uid != _uid) return; // account changed while loading
    _hasPin = results[0];
    _biometricAvailable = results[1];
    _biometricEnabled = results[2] && _biometricAvailable;
    _ready = true;
    notifyListeners();
  }

  Future<bool> createPin(String pin, {bool deferCompletion = false}) async {
    final uid = _uid;
    if (uid == null) return false;
    final ok = await PinLockService.setPin(uid, pin);
    if (ok) {
      _locked = false;
      if (!deferCompletion) {
        _hasPin = true;
        notifyListeners();
      }
    }
    return ok;
  }

  /// Marks PIN setup as finished so AuthWrapper transitions to HomeScreen.
  void completePinSetup() {
    _hasPin = true;
    _locked = false;
    notifyListeners();
  }

  /// Returns the verification result. When `remaining == 0` the caller must sign out.
  Future<PinVerifyResult> unlockWithPin(String pin) async {
    final uid = _uid;
    if (uid == null) return const PinVerifyResult(false, 0);
    final res = await PinLockService.verifyPin(uid, pin);
    if (res.ok) {
      _locked = false;
      notifyListeners();
    }
    return res;
  }

  /// Checks the current PIN without changing lock state (used before changing PIN).
  Future<PinVerifyResult> checkPin(String pin) async {
    final uid = _uid;
    if (uid == null) return const PinVerifyResult(false, 0);
    return PinLockService.verifyPin(uid, pin);
  }

  Future<bool> unlockWithBiometric() async {
    if (!_biometricEnabled) return false;
    final ok = await PinLockService.authenticateBiometric();
    if (ok) {
      _locked = false;
      // The biometric sheet pauses the activity; don't count that as backgrounding.
      _backgroundedAt = null;
      notifyListeners();
    }
    return ok;
  }

  Future<void> setBiometricEnabled(bool enabled) async {
    if (enabled && !_biometricAvailable) return;
    await PinLockService.setBiometricEnabled(enabled);
    _biometricEnabled = enabled;
    notifyListeners();
  }

  /// Called by AuthProvider.signOut and on too many wrong PIN attempts.
  Future<void> clearForSignOut() async {
    await PinLockService.clear();
    _hasPin = false;
    _locked = false;
    _biometricEnabled = false;
    notifyListeners();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused || state == AppLifecycleState.hidden) {
      _backgroundedAt ??= DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      final since = _backgroundedAt;
      _backgroundedAt = null;
      if (since != null &&
          _uid != null &&
          _hasPin &&
          !_locked &&
          DateTime.now().difference(since) >= lockAfter) {
        _locked = true;
        notifyListeners();
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _authSub?.cancel();
    super.dispose();
  }
}

