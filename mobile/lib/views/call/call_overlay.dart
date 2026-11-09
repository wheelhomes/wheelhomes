import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../providers/call_provider.dart';

/// Full-screen WhatsApp-style call UI, mounted above every route via
/// MaterialApp.builder so incoming calls appear on any screen.
class CallOverlay extends StatelessWidget {
  const CallOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<CallProvider>(
      builder: (context, call, _) {
        if (call.phase == CallPhase.idle) return const SizedBox.shrink();

        final initials = call.peerName
            .trim()
            .split(RegExp(r'\s+'))
            .where((p) => p.isNotEmpty)
            .map((p) => p[0])
            .take(2)
            .join()
            .toUpperCase();
        final ringing =
            call.phase == CallPhase.incoming || call.phase == CallPhase.outgoing;

        return Material(
          color: Colors.transparent,
          child: Container(
            width: double.infinity,
            height: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFF047857), Color(0xFF064E3B)],
              ),
            ),
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.lock, size: 13, color: Color(0xFFA7F3D0)),
                        SizedBox(width: 6),
                        Text(
                          'WHEELHOMES VOICE CALL',
                          style: TextStyle(
                            color: Color(0xFFA7F3D0),
                            fontSize: 11.5,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.8,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(flex: 2),
                    _PulsingAvatar(initials: initials.isEmpty ? 'W' : initials, pulsing: ringing),
                    const SizedBox(height: 24),
                    Text(
                      call.peerName,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (call.requestCode != null && call.requestCode!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '#${call.requestCode}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Text(
                      call.statusLabel,
                      style: TextStyle(
                        color: const Color(0xFFD1FAE5),
                        fontSize: call.phase == CallPhase.active ? 20 : 15,
                        fontWeight:
                            call.phase == CallPhase.active ? FontWeight.bold : FontWeight.w500,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    if (call.error != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        call.error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Color(0xFFFECACA), fontSize: 12.5),
                      ),
                    ],
                    const Spacer(flex: 3),
                    if (call.phase == CallPhase.incoming)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _RoundAction(
                            icon: LucideIcons.phoneOff,
                            label: 'Decline',
                            color: const Color(0xFFEF4444),
                            size: 70,
                            onTap: call.decline,
                          ),
                          _RoundAction(
                            icon: LucideIcons.phone,
                            label: 'Accept',
                            color: const Color(0xFF22C55E),
                            size: 70,
                            onTap: call.accept,
                          ),
                        ],
                      )
                    else if (call.phase == CallPhase.ended)
                      const SizedBox(height: 96)
                    else
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _RoundAction(
                            icon: call.muted ? LucideIcons.micOff : LucideIcons.mic,
                            label: call.muted ? 'Unmute' : 'Mute',
                            color: call.muted
                                ? Colors.white
                                : Colors.white.withValues(alpha: 0.15),
                            iconColor: call.muted ? const Color(0xFF065F46) : Colors.white,
                            onTap: call.phase == CallPhase.outgoing ? null : call.toggleMute,
                          ),
                          _RoundAction(
                            icon: LucideIcons.phoneOff,
                            label: 'End',
                            color: const Color(0xFFEF4444),
                            size: 70,
                            onTap: call.hangUp,
                          ),
                          _RoundAction(
                            icon: call.speakerOn ? LucideIcons.volume2 : LucideIcons.ear,
                            label: call.speakerOn ? 'Speaker' : 'Earpiece',
                            color: call.speakerOn
                                ? Colors.white
                                : Colors.white.withValues(alpha: 0.15),
                            iconColor: call.speakerOn ? const Color(0xFF065F46) : Colors.white,
                            onTap: call.toggleSpeaker,
                          ),
                        ],
                      ),
                    const SizedBox(height: 28),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _RoundAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final Color iconColor;
  final double size;
  final VoidCallback? onTap;

  const _RoundAction({
    required this.icon,
    required this.label,
    required this.color,
    this.iconColor = Colors.white,
    this.size = 60,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: onTap == null ? 0.4 : 1,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: onTap,
            child: Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.2),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Icon(icon, color: iconColor, size: size * 0.42),
            ),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(color: Color(0xFFD1FAE5), fontSize: 12)),
        ],
      ),
    );
  }
}

class _PulsingAvatar extends StatefulWidget {
  final String initials;
  final bool pulsing;
  const _PulsingAvatar({required this.initials, required this.pulsing});

  @override
  State<_PulsingAvatar> createState() => _PulsingAvatarState();
}

class _PulsingAvatarState extends State<_PulsingAvatar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1600),
  )..repeat();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 180,
      height: 180,
      child: AnimatedBuilder(
        animation: _ctrl,
        builder: (context, _) {
          return Stack(
            alignment: Alignment.center,
            children: [
              if (widget.pulsing)
                for (final offset in [0.0, 0.5])
                  Builder(builder: (_) {
                    final t = (_ctrl.value + offset) % 1.0;
                    return Container(
                      width: 120 + 60 * t,
                      height: 120 + 60 * t,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: 0.18 * (1 - t)),
                      ),
                    );
                  }),
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.15),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.45), width: 2),
                ),
                alignment: Alignment.center,
                child: Text(
                  widget.initials,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 40,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

