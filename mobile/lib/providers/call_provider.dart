import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import '../core/chat_sound.dart';
import '../services/call_service.dart';

enum CallPhase { idle, outgoing, incoming, connecting, active, ended }

class CallProvider extends ChangeNotifier {
  static const Duration ringTimeout = Duration(seconds: 45);

  final FirebaseFirestore _db = FirebaseFirestore.instance;
  CallService? _service;

  String? _userId;
  String _userName = 'Wheelhomes User';
  StreamSubscription? _incomingSub;
  StreamSubscription? _callDocSub;
  Timer? _ringLoop;
  Timer? _ringTimeout;
  Timer? _durationTimer;
  final Set<String> _handledIncoming = {};

  CallPhase phase = CallPhase.idle;
  String? callId;
  String peerName = '';
  String? requestCode;
  String? jobId;
  bool muted = false;
  bool speakerOn = false;
  int seconds = 0;
  String endReason = '';
  String? error;

  bool get isBusy => phase != CallPhase.idle;

  String get statusLabel {
    switch (phase) {
      case CallPhase.outgoing:
        return 'Ringing…';
      case CallPhase.incoming:
        return 'Incoming voice call';
      case CallPhase.connecting:
        return 'Connecting…';
      case CallPhase.active:
        final m = (seconds ~/ 60).toString().padLeft(2, '0');
        final s = (seconds % 60).toString().padLeft(2, '0');
        return '$m:$s';
      case CallPhase.ended:
        return endReason;
      case CallPhase.idle:
        return '';
    }
  }

  /// Begin listening for incoming calls for the signed-in user.
  void listenForIncomingCalls(String userId, String userName) {
    _userName = userName.trim().isNotEmpty ? userName : _userName;
    if (_userId == userId && _incomingSub != null) return;
    _incomingSub?.cancel();
    _userId = userId;

    _incomingSub = _db
        .collection('chats')
        .where('participants', arrayContains: userId)
        .snapshots()
        .listen((snap) {
      for (final change in snap.docChanges) {
        if (change.type != DocumentChangeType.added &&
            change.type != DocumentChangeType.modified) {
          continue;
        }
        final id = change.doc.id;
        final d = change.doc.data() ?? {};
        if (d['isVoiceCall'] != true ||
            d['calleeId'] != userId ||
            d['status'] != 'ringing') {
          continue;
        }
        if (_handledIncoming.contains(id)) continue;
        _handledIncoming.add(id);

        final created = d['createdAt'];
        if (created is Timestamp &&
            DateTime.now().difference(created.toDate()) > ringTimeout) {
          continue; // stale ring
        }

        if (isBusy) {
          CallService().setStatus(id, 'declined');
          continue;
        }

        callId = id;
        peerName = (d['callerName'] ?? 'Wheelhomes User').toString();
        requestCode = d['requestCode']?.toString();
        jobId = d['jobId']?.toString();
        error = null;
        _setPhase(CallPhase.incoming);
        _startRingLoop();
        ChatSoundHelper.showSystemNotification(
          title: 'Incoming call from $peerName 📞',
          body: requestCode != null
              ? 'Wheelhomes voice call about request #$requestCode — open the app to answer.'
              : 'Wheelhomes voice call — open the app to answer.',
        );
        _watchCallDoc(id);
      }
    }, onError: (e) => debugPrint('[CallProvider] incoming listener error: $e'));
  }

  Future<void> startCall({
    required String calleeId,
    required String calleeName,
    String? jobId,
    String? requestCode,
  }) async {
    if (isBusy || _userId == null || calleeId.isEmpty || calleeId == _userId) {
      return;
    }
    peerName = calleeName;
    this.requestCode = requestCode;
    this.jobId = jobId;
    error = null;
    _setPhase(CallPhase.outgoing);
    _startRingLoop(ringback: true);

    _service = CallService();
    try {
      final id = await _service!.startCall(
        callerId: _userId!,
        callerName: _userName,
        calleeId: calleeId,
        calleeName: calleeName,
        jobId: jobId,
        requestCode: requestCode,
      );
      callId = id;
      _watchCallDoc(id);
      await _service!.setSpeakerOn(true);
      speakerOn = true;

      _ringTimeout = Timer(ringTimeout, () {
        if (phase == CallPhase.outgoing) {
          _finish('No answer', updateRemote: true, status: 'missed');
          _db.collection('notifications').add({
            'userId': calleeId,
            'recipientId': calleeId,
            'title': 'Missed call from $_userName 📞',
            'message': requestCode != null
                ? 'You missed an online call about request #$requestCode.'
                : 'You missed an online voice call.',
            'body': requestCode != null
                ? 'You missed an online call about request #$requestCode.'
                : 'You missed an online voice call.',
            'type': 'info',
            'read': false,
            'isRead': false,
            'createdAt': DateTime.now().toIso8601String(),
            'payload': {'jobId': jobId, 'requestCode': requestCode},
          }).catchError((_) => _db.collection('notifications').doc());
        }
      });
    } catch (e) {
      error = 'Could not start the call. Please check your connection.';
      _finish('Call failed', updateRemote: false);
    }
  }

  Future<void> accept() async {
    final id = callId;
    if (id == null || phase != CallPhase.incoming) return;
    _stopRingLoop();
    _setPhase(CallPhase.connecting);
    _service = CallService();
    try {
      await _service!.answerCall(id, calleeId: _userId);
      await _service!.setSpeakerOn(true);
      speakerOn = true;
      _setPhase(CallPhase.active);
      _startDurationTimer();
    } catch (e) {
      error = 'Could not answer the call.';
      _finish('Call failed', updateRemote: true);
    }
  }

  void decline() => _finish('Call declined', updateRemote: true, status: 'declined');

  void hangUp() => _finish('Call ended', updateRemote: true, status: 'ended');

  void toggleMute() {
    muted = !muted;
    _service?.setMuted(muted);
    notifyListeners();
  }

  void toggleSpeaker() {
    speakerOn = !speakerOn;
    _service?.setSpeakerOn(speakerOn);
    notifyListeners();
  }

  // ---------------------------------------------------------------------------

  void _watchCallDoc(String id) {
    _callDocSub?.cancel();
    _callDocSub = _db.collection('chats').doc(id).snapshots().listen((snap) {
      final status = snap.data()?['status'];
      if (status == 'accepted' &&
          (phase == CallPhase.outgoing || phase == CallPhase.connecting)) {
        _stopRingLoop();
        _ringTimeout?.cancel();
        _service?.startAudioStream();
        _service?.setSpeakerOn(true);
        speakerOn = true;
        if (phase != CallPhase.active) {
          _setPhase(CallPhase.active);
          _startDurationTimer();
        }
      } else if (status == 'declined' &&
          (phase == CallPhase.outgoing || phase == CallPhase.incoming)) {
        _finish(phase == CallPhase.outgoing ? 'Call declined' : 'Call ended',
            updateRemote: false);
      } else if (status == 'ended' &&
          phase != CallPhase.idle &&
          phase != CallPhase.ended) {
        _finish('Call ended', updateRemote: false);
      } else if (status == 'missed' && phase == CallPhase.incoming) {
        _finish('Missed call', updateRemote: false);
      }
    });
  }

  void _startRingLoop({bool ringback = false}) {
    _stopRingLoop();
    void ring() {
      if (ringback) {
        ChatSoundHelper.playOutgoingPop();
      } else {
        ChatSoundHelper.playIncomingTune(force: true);
        HapticFeedback.vibrate();
      }
    }

    ring();
    _ringLoop = Timer.periodic(
      Duration(milliseconds: ringback ? 2500 : 1800),
      (_) => ring(),
    );
  }

  void _stopRingLoop() {
    _ringLoop?.cancel();
    _ringLoop = null;
  }

  void _startDurationTimer() {
    _durationTimer?.cancel();
    seconds = 0;
    _durationTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      seconds++;
      notifyListeners();
    });
  }

  void _finish(String reason, {required bool updateRemote, String status = 'ended'}) {
    _stopRingLoop();
    _ringTimeout?.cancel();
    _durationTimer?.cancel();
    _callDocSub?.cancel();
    _callDocSub = null;

    final id = callId;
    if (updateRemote && id != null) {
      CallService().setStatus(id, status);
    }
    _service?.dispose();
    _service = null;
    callId = null;
    endReason = reason;
    _setPhase(CallPhase.ended);

    Future.delayed(const Duration(milliseconds: 1800), () {
      if (phase == CallPhase.ended) {
        peerName = '';
        requestCode = null;
        jobId = null;
        muted = false;
        speakerOn = false;
        seconds = 0;
        error = null;
        _setPhase(CallPhase.idle);
      }
    });
  }

  void _setPhase(CallPhase p) {
    phase = p;
    notifyListeners();
  }

  @override
  void dispose() {
    _incomingSub?.cancel();
    _callDocSub?.cancel();
    _ringLoop?.cancel();
    _ringTimeout?.cancel();
    _durationTimer?.cancel();
    _service?.dispose();
    super.dispose();
  }
}
