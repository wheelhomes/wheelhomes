import 'package:flutter/services.dart';

class PinVerifyResult {
  final bool ok;
  final int remaining;
  const PinVerifyResult(this.ok, this.remaining);
}

/// Thin wrapper over the native `PinLockHandler` (Android Keystore-backed).
class PinLockService {
  static const MethodChannel _channel = MethodChannel('com.wheelhomes.app/pinlock');
  static const int pinLength = 6;
  static const int maxAttempts = 5;

  static Future<bool> hasPin(String uid) async {
    try {
      return await _channel.invokeMethod<bool>('hasPin', {'uid': uid}) ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> setPin(String uid, String pin) async {
    try {
      return await _channel.invokeMethod<bool>('setPin', {'uid': uid, 'pin': pin}) ?? false;
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
      return PinVerifyResult(
        res?['ok'] == true,
        (res?['remaining'] as num?)?.toInt() ?? 0,
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

