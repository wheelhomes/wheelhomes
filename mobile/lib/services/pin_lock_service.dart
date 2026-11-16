import 'package:flutter/services.dart';

class PinVerifyResult {
  final bool ok;
  final int remaining;
  final String email;
  final String password;
  final String uid;

  const PinVerifyResult(
    this.ok,
    this.remaining, {
    this.email = '',
    this.password = '',
    this.uid = '',
  });
}

class PinDeviceMeta {
  final bool hasPin;
  final String uid;
  final String email;
  final String name;
  final bool canUseBiometric;
  final bool biometricEnabled;

  const PinDeviceMeta({
    required this.hasPin,
    required this.uid,
    required this.email,
    required this.name,
    required this.canUseBiometric,
    required this.biometricEnabled,
  });
}

/// Thin wrapper over the native `PinLockHandler` (Android Keystore-backed).
class PinLockService {
  static const MethodChannel _channel = MethodChannel('com.wheelhomes.app/pinlock');
  static const int pinLength = 6;
  static const int maxAttempts = 5;

  static Future<PinDeviceMeta> getPinMeta() async {
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('getPinMeta');
      return PinDeviceMeta(
        hasPin: res?['hasPin'] == true,
        uid: (res?['uid'] ?? '').toString(),
        email: (res?['email'] ?? '').toString(),
        name: (res?['name'] ?? '').toString(),
        canUseBiometric: res?['canUseBiometric'] == true,
        biometricEnabled: res?['biometricEnabled'] == true,
      );
    } catch (_) {
      return const PinDeviceMeta(
        hasPin: false,
        uid: '',
        email: '',
        name: '',
        canUseBiometric: false,
        biometricEnabled: false,
      );
    }
  }

  static Future<void> saveCredentials({
    required String uid,
    required String email,
    required String password,
    String name = '',
  }) async {
    try {
      await _channel.invokeMethod('saveCredentials', {
        'uid': uid,
        'email': email,
        'password': password,
        'name': name,
      });
    } catch (_) {}
  }

  static Future<Map<String, String>> getSavedCredentials() async {
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('getSavedCredentials');
      return {
        'email': (res?['email'] ?? '').toString(),
        'password': (res?['password'] ?? '').toString(),
        'uid': (res?['uid'] ?? '').toString(),
      };
    } catch (_) {
      return {'email': '', 'password': '', 'uid': ''};
    }
  }

  static Future<bool> hasPin(String uid) async {
    try {
      return await _channel.invokeMethod<bool>('hasPin', {'uid': uid}) ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> setPin(
    String uid,
    String pin, {
    String email = '',
    String name = '',
  }) async {
    try {
      return await _channel.invokeMethod<bool>('setPin', {
            'uid': uid,
            'pin': pin,
            'email': email,
            'name': name,
          }) ??
          false;
    } catch (_) {
      return false;
    }
  }

  static Future<PinVerifyResult> verifyPin(String uid, String pin) async {
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>(
        'verifyPin',
        {'uid': uid, 'pin': pin},
      );
      if (res == null) {
        return const PinVerifyResult(false, maxAttempts);
      }
      return PinVerifyResult(
        res['ok'] == true,
        (res['remaining'] as num?)?.toInt() ?? maxAttempts,
        email: (res['email'] ?? '').toString(),
        password: (res['password'] ?? '').toString(),
        uid: (res['uid'] ?? '').toString(),
      );
    } catch (_) {
      return const PinVerifyResult(false, maxAttempts);
    }
  }

  static Future<void> clear() async {
    try {
      await _channel.invokeMethod('clearPin');
    } catch (_) {}
  }

  static Future<bool> canUseBiometric() async {
    try {
      return await _channel.invokeMethod<bool>('canUseBiometric') ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> isBiometricEnabled() async {
    try {
      return await _channel.invokeMethod<bool>('isBiometricEnabled') ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<void> setBiometricEnabled(bool enabled) async {
    try {
      await _channel.invokeMethod('setBiometricEnabled', {'enabled': enabled});
    } catch (_) {}
  }

  static Future<bool> authenticateBiometric() async {
    try {
      return await _channel.invokeMethod<bool>('authenticateBiometric') ?? false;
    } catch (_) {
      return false;
    }
  }
}
