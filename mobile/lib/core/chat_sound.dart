import 'package:flutter/services.dart';

class ChatSoundHelper {
  static const MethodChannel _channel = MethodChannel('com.wheelhomes.app/sound');
  static bool isMuted = false;
  static int _lastPlayedMs = 0;
  static int _lastNotifMs = 0;
  static String _lastNotifSignature = '';

  /// Posts a real Android System Notification into the phone's top status bar / notification shade
  static Future<void> showSystemNotification({
    required String title,
    required String body,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final sig = '${title.trim()}__${body.trim()}';
    if (sig == _lastNotifSignature && (now - _lastNotifMs) < 2500) {
      return; // Deduplicate identical notifications within 2.5s
    }
    _lastNotifSignature = sig;
    _lastNotifMs = now;

    try {
      await _channel.invokeMethod('showSystemNotification', {
        'title': title,
        'body': body,
        'id': now % 100000,
      });
    } catch (_) {}
  }

  /// Minimizes the app to the background without destroying MainActivity or closing listeners
  static Future<void> moveTaskToBack() async {
    try {
      await _channel.invokeMethod('moveTaskToBack');
    } catch (_) {}
  }

  /// Opens the native Android phone dialer with the specified phone number pre-filled
  static Future<bool> dialPhoneNumber(String phone) async {
    try {
      final res = await _channel.invokeMethod<bool>('dialPhoneNumber', {
        'phone': phone.trim(),
      });
      return res == true;
    } catch (_) {
      return false;
    }
  }

  /// Plays the incoming WhatsApp-style G5 -> D6 chime + haptic alert across the app
  static Future<void> playIncomingTune({bool force = false}) async {
    if (!force && isMuted) return;

    final now = DateTime.now().millisecondsSinceEpoch;
    if (!force && (now - _lastPlayedMs) < 900) {
      return; // Deduplicate simultaneous global + chat screen triggers
    }
    _lastPlayedMs = now;

    try {
      await _channel.invokeMethod('playNotificationTune');
    } catch (_) {
      await SystemSound.play(SystemSoundType.click);
    }

    await HapticFeedback.heavyImpact();
  }

  /// Subtle outgoing message pop + light haptic
  static Future<void> playOutgoingPop() async {
    if (isMuted) return;
    try {
      await _channel.invokeMethod('playOutgoingPop');
    } catch (_) {
      await SystemSound.play(SystemSoundType.click);
    }
    await HapticFeedback.lightImpact();
  }
}
