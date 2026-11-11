import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/app_logo.dart';
import '../../core/theme.dart';
import '../../providers/app_lock_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/pin_lock_service.dart';

/// Reusable PIN entry: dots + numeric keypad (no system keyboard, no TextField),
/// so it also works inside MaterialApp.builder where there is no Navigator/Overlay.
class PinPad extends StatefulWidget {
  final int length;
  final ValueChanged<String> onCompleted;
  final VoidCallback? onBiometric;
  final bool enabled;

  const PinPad({
    super.key,
    required this.onCompleted,
    this.length = PinLockService.pinLength,
    this.onBiometric,
    this.enabled = true,
  });

  @override
  State<PinPad> createState() => PinPadState();
}

class PinPadState extends State<PinPad> {
  String _value = '';

  void clear() => setState(() => _value = '');

  void _tap(String digit) {
    if (!widget.enabled || _value.length >= widget.length) return;
    HapticFeedback.selectionClick();
    setState(() => _value += digit);
    if (_value.length == widget.length) {
      final pin = _value;
      Future.delayed(const Duration(milliseconds: 120), () => widget.onCompleted(pin));
    }
  }

  void _backspace() {
    if (!widget.enabled || _value.isEmpty) return;
    setState(() => _value = _value.substring(0, _value.length - 1));
  }

  Widget _key(String label) {
    return _PadButton(
      onTap: () => _tap(label),
      child: Text(
        label,
        style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(widget.length, (i) {
            final filled = i < _value.length;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 120),
              margin: const EdgeInsets.symmetric(horizontal: 8),
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: filled ? AppTheme.primary : Colors.transparent,
                border: Border.all(color: filled ? AppTheme.primary : AppTheme.border, width: 2),
              ),
            );
          }),
        ),
        const SizedBox(height: 36),
        for (final row in const [
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ])
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: row.map(_key).toList(),
          ),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            widget.onBiometric != null
                ? _PadButton(
                    onTap: widget.onBiometric!,
                    child: const Icon(LucideIcons.fingerprint, size: 28, color: AppTheme.primary),
                  )
                : const SizedBox(width: 88, height: 72),
            _key('0'),
            _PadButton(
              onTap: _backspace,
              child: const Icon(LucideIcons.delete, size: 24, color: AppTheme.textSecondary),
            ),
          ],
        ),
      ],
    );
  }
}

class _PadButton extends StatelessWidget {
  final VoidCallback onTap;
  final Widget child;
  const _PadButton({required this.onTap, required this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Material(
        color: Colors.transparent,
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: SizedBox(width: 72, height: 64, child: Center(child: child)),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Create / change PIN
// ---------------------------------------------------------------------------

enum _SetupStep { current, create, confirm, biometric }

class PinSetupScreen extends StatefulWidget {
  /// When true the user must enter their current PIN first (Profile -> Change PIN).
  final bool isChange;
  const PinSetupScreen({super.key, this.isChange = false});

  @override
  State<PinSetupScreen> createState() => _PinSetupScreenState();
}

class _PinSetupScreenState extends State<PinSetupScreen> {
  final _padKey = GlobalKey<PinPadState>();
  late _SetupStep _step = widget.isChange ? _SetupStep.current : _SetupStep.create;
  String _firstPin = '';
  String? _error;
  bool _busy = false;

  String get _title => switch (_step) {
        _SetupStep.current => 'Enter current PIN',
        _SetupStep.create => widget.isChange ? 'Choose a new PIN' : 'Create your login PIN',
        _SetupStep.confirm => 'Confirm your PIN',
        _SetupStep.biometric => 'Unlock faster',
      };

  String get _subtitle => switch (_step) {
        _SetupStep.current => 'For your security, confirm your current PIN first.',
        _SetupStep.create =>
          'Next time you open Wheelhomes, use this ${PinLockService.pinLength}-digit PIN instead of your password.',
        _SetupStep.confirm => 'Enter the same PIN again.',
        _SetupStep.biometric => 'Use your fingerprint or face to unlock Wheelhomes. Your PIN still works as a backup.',
      };

  bool _isWeak(String pin) {
    if (pin.split('').toSet().length == 1) return true; // 111111
    const asc = '0123456789';
    const desc = '9876543210';
    return asc.contains(pin) || desc.contains(pin); // 123456 / 654321
  }

  Future<void> _onCompleted(String pin) async {
    final lock = context.read<AppLockProvider>();
    setState(() => _error = null);

    switch (_step) {
      case _SetupStep.current:
        setState(() => _busy = true);
        final res = await lock.checkPin(pin);
        if (!mounted) return;
        setState(() => _busy = false);
        if (res.ok) {
          setState(() => _step = _SetupStep.create);
        } else if (res.remaining <= 0) {
          await context.read<AuthProvider>().signOut();
          if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
          return;
        } else {
          setState(() => _error = 'Incorrect PIN. ${res.remaining} attempt(s) left.');
        }
        break;
      case _SetupStep.create:
        if (_isWeak(pin)) {
          setState(() => _error = 'That PIN is too easy to guess. Avoid repeated or sequential digits.');
        } else {
          setState(() {
            _firstPin = pin;
            _step = _SetupStep.confirm;
          });
        }
        break;
      case _SetupStep.confirm:
        if (pin != _firstPin) {
          setState(() {
            _error = "PINs didn't match. Please start again.";
            _firstPin = '';
            _step = _SetupStep.create;
          });
          break;
        }
        setState(() => _busy = true);
        final needsBiometricStep = lock.biometricAvailable && !lock.biometricEnabled;
        final ok = await lock.createPin(pin, deferCompletion: needsBiometricStep);
        if (!mounted) return;
        setState(() => _busy = false);
        if (!ok) {
          setState(() {
            _error = 'Could not save your PIN. Please try again.';
            _step = _SetupStep.create;
          });
        } else if (needsBiometricStep) {
          setState(() => _step = _SetupStep.biometric);
        } else {
          _finish();
        }
        break;
      case _SetupStep.biometric:
        break;
    }
    _padKey.currentState?.clear();
  }

  void _finish() {
    final lock = context.read<AppLockProvider>();
    lock.completePinSetup();
    if (widget.isChange && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your login PIN & security settings have been updated.')),
      );
      Navigator.of(context).pop();
    }
    // First-time setup: AuthWrapper rebuilds to HomeScreen automatically.
  }

  @override
  Widget build(BuildContext context) {
    final lock = context.watch<AppLockProvider>();
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: widget.isChange
          ? AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Change PIN'))
          : null,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (widget.isChange && lock.biometricAvailable) ...[
                  Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: SwitchListTile(
                      secondary: const Icon(LucideIcons.fingerprint, color: AppTheme.primary),
                      title: const Text(
                        'Fingerprint / Face Unlock',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                      ),
                      subtitle: const Text(
                        'Unlock Wheelhomes instantly using biometrics',
                        style: TextStyle(fontSize: 11.5, color: AppTheme.textSecondary),
                      ),
                      activeTrackColor: AppTheme.primary,
                      value: lock.biometricEnabled,
                      onChanged: (val) async {
                        final messenger = ScaffoldMessenger.maybeOf(context);
                        if (val) {
                          await lock.setBiometricEnabled(true);
                          final ok = await lock.unlockWithBiometric();
                          if (!ok) {
                            await lock.setBiometricEnabled(false);
                            messenger?.showSnackBar(
                              const SnackBar(content: Text('Biometric verification cancelled.')),
                            );
                          } else {
                            messenger?.showSnackBar(
                              const SnackBar(content: Text('Fingerprint / Face unlock enabled!')),
                            );
                          }
                        } else {
                          await lock.setBiometricEnabled(false);
                        }
                      },
                    ),
                  ),
                ],
                if (!widget.isChange) const AppLogo(height: 48, alignment: Alignment.center),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _step == _SetupStep.biometric ? LucideIcons.fingerprint : LucideIcons.lockKeyhole,
                    color: AppTheme.primary,
                    size: 28,
                  ),
                ),
                const SizedBox(height: 16),
                Text(_title,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center),
                const SizedBox(height: 8),
                Text(_subtitle,
                    style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4),
                    textAlign: TextAlign.center),
                const SizedBox(height: 12),
                SizedBox(
                  height: 36,
                  child: _error == null
                      ? null
                      : Text(_error!,
                          style: const TextStyle(fontSize: 12.5, color: AppTheme.error),
                          textAlign: TextAlign.center),
                ),
                if (_step == _SetupStep.biometric) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        final messenger = ScaffoldMessenger.maybeOf(context);
                        await lock.setBiometricEnabled(true);
                        final ok = await lock.unlockWithBiometric();
                        if (!ok) {
                          await lock.setBiometricEnabled(false);
                          messenger?.showSnackBar(
                            const SnackBar(content: Text('Fingerprint not confirmed. You can turn it on later in Profile.')),
                          );
                        }
                        if (mounted) _finish();
                      },
                      icon: const Icon(LucideIcons.fingerprint, size: 18),
                      label: const Text('Use fingerprint / face'),
                    ),
                  ),
                  TextButton(
                    onPressed: _finish,
                    child: const Text('Not now', style: TextStyle(color: AppTheme.textSecondary)),
                  ),
                ] else
                  PinPad(key: _padKey, enabled: !_busy, onCompleted: _onCompleted),
                if (!widget.isChange && _step != _SetupStep.biometric) ...[
                  const SizedBox(height: 16),
                  TextButton.icon(
                    onPressed: () => context.read<AuthProvider>().signOut(),
                    icon: const Icon(LucideIcons.logOut, size: 16, color: AppTheme.textSecondary),
                    label: const Text('Sign out', style: TextStyle(color: AppTheme.textSecondary)),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Unlock overlay (sits above the Navigator in MaterialApp.builder)
// ---------------------------------------------------------------------------

class AppLockOverlay extends StatelessWidget {
  const AppLockOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    final lock = context.watch<AppLockProvider>();
    if (!lock.isLocked) return const SizedBox.shrink();
    return const Positioned.fill(child: _PinUnlockView());
  }
}

class _PinUnlockView extends StatefulWidget {
  const _PinUnlockView();

  @override
  State<_PinUnlockView> createState() => _PinUnlockViewState();
}

class _PinUnlockViewState extends State<_PinUnlockView> {
  final _padKey = GlobalKey<PinPadState>();
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final lock = context.read<AppLockProvider>();
      if (lock.biometricEnabled) lock.unlockWithBiometric();
    });
  }

  Future<void> _onCompleted(String pin) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final lock = context.read<AppLockProvider>();
    final res = await lock.unlockWithPin(pin);
    if (!mounted) return;
    if (res.ok) return; // overlay disappears
    if (res.remaining <= 0) {
      // Too many wrong attempts: force a full email + password sign-in.
      await context.read<AuthProvider>().signOut();
      return;
    }
    setState(() {
      _busy = false;
      _error = 'Incorrect PIN. ${res.remaining} attempt(s) left before you are signed out.';
    });
    HapticFeedback.heavyImpact();
    _padKey.currentState?.clear();
  }

  @override
  Widget build(BuildContext context) {
    final lock = context.watch<AppLockProvider>();
    final auth = context.watch<AuthProvider>();
    final name = auth.userProfile?.fullName.trim();
    final email = auth.user?.email ?? '';
    final greetingName = (name != null && name.isNotEmpty) ? name.split(' ').first : null;

    return Material(
      color: Colors.white,
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const AppLogo(height: 48, alignment: Alignment.center),
                const SizedBox(height: 28),
                Text(
                  greetingName != null ? 'Welcome back, $greetingName' : 'Welcome back',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 6),
                Text(
                  email.isNotEmpty ? 'Enter your PIN to continue as $email' : 'Enter your PIN to continue',
                  style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 36,
                  child: _error == null
                      ? null
                      : Text(_error!,
                          style: const TextStyle(fontSize: 12.5, color: AppTheme.error),
                          textAlign: TextAlign.center),
                ),
                PinPad(
                  key: _padKey,
                  enabled: !_busy,
                  onCompleted: _onCompleted,
                  onBiometric: lock.biometricEnabled ? () => lock.unlockWithBiometric() : null,
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => context.read<AuthProvider>().signOut(),
                  child: const Text(
                    'Forgot PIN? Sign in with email & password',
                    style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

