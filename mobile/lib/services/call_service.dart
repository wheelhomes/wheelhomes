import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// WhatsApp-style online voice calls (Firestore signaling + real-time 16kHz wideband voice relay).
class CallService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  static const MethodChannel _channel = MethodChannel('com.wheelhomes.app/sound');

  String? callId;
  String? _myUserId;
  bool _audioStarted = false;
  bool _muted = false;
  bool _speakerMuted = false;
  int _seqOut = 0;
  final Map<String, int> _lastSeqBySender = {};
  final List<StreamSubscription> _subs = [];
  void Function(String status)? onRemoteStatus;

  CallService() {
    _channel.setMethodCallHandler(_handleNativeCall);
  }

  DocumentReference<Map<String, dynamic>> callRef(String id) =>
      _db.collection('chats').doc(id);

  Future<dynamic> _handleNativeCall(MethodCall call) async {
    if (call.method == 'onLocalVoiceChunk') {
      final b64 = call.arguments as String?;
      final id = callId;
      final uid = _myUserId;
      if (!_muted &&
          b64 != null &&
          b64.isNotEmpty &&
          id != null &&
          uid != null &&
          _audioStarted) {
        _seqOut += 1;
        final myField = 'voice_$uid';
        callRef(id).update({
          myField: {
            'seq': _seqOut,
            'senderId': uid,
            'b64': b64,
            'rate': 16000,
          },
        }).catchError((_) {});
      }
    }
    return null;
  }

  Future<void> startAudioStream() async {
    if (_audioStarted) return;
    _audioStarted = true;
    try {
      debugPrint('[VoiceCall] Starting native 16kHz voice stream (uid=$_myUserId)');
      await _channel.invokeMethod('startVoiceCallAudio');
    } catch (e) {
      debugPrint('[VoiceCall] startVoiceCallAudio error: $e');
    }
  }

  void _attachDocListener(DocumentReference<Map<String, dynamic>> ref) {
    _subs.add(ref.snapshots().listen((snap) {
      final data = snap.data();
      if (data == null) return;
      final st = (data['status'] ?? '').toString();
      if (st.isNotEmpty) {
        onRemoteStatus?.call(st);
      }
      if (st == 'accepted' && !_audioStarted) {
        startAudioStream();
      }
      final myField = 'voice_$_myUserId';
      for (final entry in data.entries) {
        final key = entry.key;
        if (key == myField) continue;
        if (!key.startsWith('voice_') && key != 'voiceChunk') continue;
        final vc = entry.value;
        if (vc is Map) {
          final senderId = (vc['senderId'] ?? '').toString();
          final seq = (vc['seq'] is num) ? (vc['seq'] as num).toInt() : 0;
          final b64 = (vc['b64'] ?? '').toString();
          final rate = (vc['rate'] is num) ? (vc['rate'] as num).toInt() : 16000;
          final lastSeq = _lastSeqBySender[senderId] ?? 0;
          if (senderId.isNotEmpty &&
              senderId != _myUserId &&
              seq > lastSeq &&
              b64.isNotEmpty) {
            _lastSeqBySender[senderId] = seq;
            if (!_audioStarted) {
              startAudioStream();
            }
            if (!_speakerMuted) {
              debugPrint(
                  '[VoiceCall] Playing incoming 16kHz frame #$seq from $senderId (${b64.length} chars)');
              _channel.invokeMethod('playVoiceChunk', {
                'b64': b64,
                'rate': rate,
              }).catchError((_) {});
            }
          }
        }
      }
    }));
  }

  /// Caller: create call doc in `chats` collection. Returns callId.
  Future<String> startCall({
    required String callerId,
    required String callerName,
    required String calleeId,
    required String calleeName,
    String? jobId,
    String? requestCode,
  }) async {
    _myUserId = callerId;
    final ref = await _db.collection('chats').add({
      'participants': [callerId, calleeId],
      'isVoiceCall': true,
      'callerId': callerId,
      'callerName': callerName,
      'calleeId': calleeId,
      'calleeName': calleeName,
      'jobId': jobId,
      'requestCode': requestCode,
      'status': 'ringing',
      'platform': 'android',
      'callerCandidates': <Map<String, dynamic>>[],
      'calleeCandidates': <Map<String, dynamic>>[],
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    callId = ref.id;
    _attachDocListener(ref);
    return ref.id;
  }

  /// Callee: answer an incoming call and start live two-way voice audio.
  Future<void> answerCall(String id, {String? calleeId}) async {
    final ref = callRef(id);
    callId = id;
    if (calleeId != null && calleeId.isNotEmpty) {
      _myUserId = calleeId;
    } else {
      final snap = await ref.get();
      _myUserId = (snap.data()?['calleeId'] ?? '').toString();
    }
    await startAudioStream();
    _attachDocListener(ref);
    await ref.update({
      'status': 'accepted',
      'answeredAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> setStatus(String id, String status) async {
    try {
      await callRef(id).update({
        'status': status,
        'updatedAt': FieldValue.serverTimestamp(),
        if (status == 'ended' || status == 'declined' || status == 'missed')
          'endedAt': FieldValue.serverTimestamp(),
      });
    } catch (_) {}
  }

  void setMuted(bool muted) {
    _muted = muted;
  }

  Future<void> setSpeakerOn(bool on) async {
    // Do not call Android AudioManager.isSpeakerphoneOn on the 16KB emulator,
    // as it restarts media.audio_flinger. USAGE_MEDIA already outputs to speaker.
    _speakerMuted = false;
  }

  Future<void> dispose() async {
    _audioStarted = false;
    try {
      await _channel.invokeMethod('stopVoiceCallAudio');
    } catch (_) {}
    for (final s in _subs) {
      await s.cancel();
    }
    _subs.clear();
    callId = null;
  }
}
