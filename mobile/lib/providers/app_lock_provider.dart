import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/widgets.dart';
import '../services/pin_lock_service.dart';

/// Controls the app lock:
/// - Whenever a PIN exists on the device on app launch, the app ALWAYS starts LOCKED
///   (even before Firebase Auth finishes restoring its session).
/// - Returning to the app after closing/minimizing it re-locks the app.
/// - Only an explicit Sign Out clears the device PIN and returns to Email & Password login.
class AppLockProvider extends ChangeNotifier with WidgetsBindingObserver {
  static const Duration lockAfter = Duration(seconds: 2);

  StreamSubscription<User?>? _authSub;
  String? _uid;
  String _cachedEmail = '';
  String _cachedName = '';
  bool _ready = false;
  bool _hasPin = false;
  bool _locked = false;
  bool _biometricAvailable = false;
  bool _biometricEnabled = false;
  bool _isAuthenticatingBiometric = false;
  DateTime? _backgroundedAt;

  bool get isReady => _ready;
  bool get hasPin => _hasPin;
  bool get isLocked => _locked && _hasPin;
  bool get biometricAvailable => _biometricAvailable;
  bool get biometricEnabled => _biometricEnabled;
  String? get uid => _uid;
  String get cachedEmail => _cachedEmail;
  String get cachedName => _cachedName;

  AppLockProvider() {
    WidgetsBinding.instance.addObserver(this);
    _initFromDevice();
    _authSub = FirebaseAuth.instance.authStateChanges().listen(_onAuthChanged);
  }

  Future<void> _initFromDevice() async {
    final current = FirebaseAuth.instance.currentUser;
    if (current != null) {
      _uid = current.uid;
      _cachedEmail = current.email ?? '';
      _cachedName = current.displayName ?? '';
    }
    final meta = await PinLockService.getPinMeta();
    if (meta.hasPin) {
      _hasPin = true;
      _locked = true;
      if (_uid == null || _uid!.isEmpty) {
        _uid = meta.uid;
      }
      if (meta.email.isNotEmpty) _cachedEmail = meta.email;
      if (meta.name.isNotEmpty) _cachedName = meta.name;
    } else if (current != null) {
      final has = await PinLockService.hasPin(current.uid);
      _hasPin = has;
      _locked = has;
    }
    _biometricAvailable = meta.canUseBiometric;
    _biometricEnabled = meta.biometricEnabled && meta.canUseBiometric;
    _ready = true;
    notifyListeners();
  }

  Future<void> _onAuthChanged(User? user) async {
    if (user == null) {
      // Do NOT wipe _hasPin or _locked here if the device still has a saved PIN on disk!
      // Only explicit clearForSignOut() wipes the device PIN.
      final meta = await PinLockService.getPinMeta();
      if (!meta.hasPin) {
        _uid = null;
        _hasPin = false;
        _locked = false;
        _biometricEnabled = false;
        _ready = true;
        notifyListeners();
      }
      return;
    }

    _uid = user.uid;
    if ((user.email ?? '').isNotEmpty) _cachedEmail = user.email!;
    if ((user.displayName ?? '').isNotEmpty) _cachedName = user.displayName!;

    final meta = await PinLockService.getPinMeta();
    _biometricAvailable = meta.canUseBiometric;
    _biometricEnabled = meta.biometricEnabled && meta.canUseBiometric;
    if (meta.hasPin) {
      _hasPin = true;
      // Never set _locked = false here; only unlocking or creating a PIN unlocks.
    } else {
      _hasPin = false;
      _locked = false;
    }
    _ready = true;
    notifyListeners();
  }

  Future<bool> createPin(
    String pin, {
    bool deferCompletion = false,
    String email = '',
    String name = '',
  }) async {
    final effectiveUid = _uid ?? FirebaseAuth.instance.currentUser?.uid ?? '';
    if (effectiveUid.isEmpty) return false;
    _uid = effectiveUid;
    final effectiveEmail = email.isNotEmpty
        ? email
        : (FirebaseAuth.instance.currentUser?.email ?? _cachedEmail);
    final effectiveName = name.isNotEmpty
        ? name
        : (FirebaseAuth.instance.currentUser?.displayName ?? _cachedName);

    final ok = await PinLockService.setPin(
      effectiveUid,
      pin,
      email: effectiveEmail,
      name: effectiveName,
    );
    if (ok) {
      _cachedEmail = effectiveEmail;
      _cachedName = effectiveName;
      _locked = false;
      if (_biometricAvailable && !_biometricEnabled) {
        await PinLockService.setBiometricEnabled(true);
        _biometricEnabled = true;
      }
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
    final uid = _uid ?? FirebaseAuth.instance.currentUser?.uid ?? '';
    final res = await PinLockService.verifyPin(uid, pin);
    if (res.ok) {
      _locked = false;
      notifyListeners();
    }
    return res;
  }

  /// Checks the current PIN without changing lock state (used before changing PIN).
  Future<PinVerifyResult> checkPin(String pin) async {
    final uid = _uid ?? FirebaseAuth.instance.currentUser?.uid ?? '';
    return PinLockService.verifyPin(uid, pin);
  }

  Future<bool> unlockWithBiometric() async {
    if (!_biometricAvailable) return false;
    _isAuthenticatingBiometric = true;
    final ok = await PinLockService.authenticateBiometric();
    _isAuthenticatingBiometric = false;
    _backgroundedAt = null;
    if (ok) {
      _locked = false;
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

  /// Called ONLY by AuthProvider.signOut and on too many wrong PIN attempts.
  Future<void> clearForSignOut() async {
    await PinLockService.clear();
    _uid = null;
    _cachedEmail = '';
    _cachedName = '';
    _hasPin = false;
    _locked = false;
    _biometricEnabled = false;
    notifyListeners();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_isAuthenticatingBiometric) return;
    if (state == AppLifecycleState.paused || state == AppLifecycleState.hidden) {
      _backgroundedAt ??= DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      final since = _backgroundedAt;
      _backgroundedAt = null;
      if (since != null &&
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
