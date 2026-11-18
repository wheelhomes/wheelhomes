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

enum _SetupStep { current, create, confirm }

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
        _SetupStep.current => 'Enter Current PIN',
        _SetupStep.create => 'Create a New 6-Digit Login PIN',
        _SetupStep.confirm => 'Confirm Your New Login PIN',
      };

  String get _subtitle => switch (_step) {
        _SetupStep.current => 'For your security, confirm your current PIN first.',
        _SetupStep.create =>
          'Choose a ${PinLockService.pinLength}-digit PIN you will use to log in quickly instead of your email and password.',
        _SetupStep.confirm =>
          'Re-enter the same ${PinLockService.pinLength}-digit PIN to confirm and activate it.',
      };

  Future<void> _onCompleted(String pin) async {
    final lock = context.read<AppLockProvider>();
    final auth = context.read<AuthProvider>();
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
          await lock.clearForSignOut();
          if (mounted) await auth.signOut();
          if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
          return;
        } else {
          setState(() => _error = 'Incorrect PIN. ${res.remaining} attempt(s) left.');
        }
        break;

      case _SetupStep.create:
        setState(() {
          _firstPin = pin;
          _step = _SetupStep.confirm;
        });
        break;

      case _SetupStep.confirm:
        if (pin != _firstPin) {
          setState(() {
            _firstPin = '';
            _step = _SetupStep.create;
            _error = 'PINs did not match. Please enter your new PIN again.';
          });
          HapticFeedback.heavyImpact();
          break;
        }
        setState(() => _busy = true);
        final email = auth.user?.email ?? auth.userProfile?.email ?? lock.cachedEmail;
        final name = auth.userProfile?.fullName ?? auth.user?.displayName ?? lock.cachedName;
        final ok = await lock.createPin(
          pin,
          email: email,
          name: name,
        );
        if (!mounted) return;
        setState(() => _busy = false);
        if (!ok) {
          setState(() {
            _firstPin = '';
            _step = _SetupStep.create;
            _error = 'Could not save your PIN. Please try again.';
          });
        } else {
          _finish();
        }
        break;
    }
    _padKey.currentState?.clear();
  }

  void _finish() {
    final lock = context.read<AppLockProvider>();
    lock.completePinSetup();
    if (widget.isChange && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Your 6-digit Login PIN has been saved!'),
          backgroundColor: AppTheme.accent,
        ),
      );
      Navigator.of(context).pop();
    } else if (mounted) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(
          content: Text('Login PIN activated! Next time you open the app, just enter your PIN.'),
          backgroundColor: AppTheme.accent,
        ),
      );
    }
    // First-time setup: AuthWrapper rebuilds to HomeScreen automatically.
  }

  @override
  Widget build(BuildContext context) {
    final lock = context.watch<AppLockProvider>();
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: widget.isChange
          ? AppBar(backgroundColor: Colors.white, elevation: 0, title: const Text('Security & Login PIN'))
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
                  child: const Icon(
                    LucideIcons.lockKeyhole,
                    color: AppTheme.primary,
                    size: 28,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  _title,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  _subtitle,
                  style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 36,
                  child: _error == null
                      ? null
                      : Text(
                          _error!,
                          style: const TextStyle(fontSize: 12.5, color: AppTheme.error),
                          textAlign: TextAlign.center,
                        ),
                ),
                PinPad(key: _padKey, enabled: !_busy, onCompleted: _onCompleted),
                if (!widget.isChange) ...[
                  const SizedBox(height: 16),
                  TextButton.icon(
                    onPressed: () async {
                      final lockProv = context.read<AppLockProvider>();
                      final authProv = context.read<AuthProvider>();
                      await lockProv.clearForSignOut();
                      await authProv.signOut();
                    },
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
      _tryBiometricOnLaunch();
    });
  }

  Future<void> _tryBiometricOnLaunch() async {
    if (!mounted) return;
    final lock = context.read<AppLockProvider>();
    final auth = context.read<AuthProvider>();
    if (lock.biometricEnabled) {
      final ok = await lock.unlockWithBiometric();
      if (ok && mounted && !auth.isAuthenticated) {
        await auth.restoreSessionAfterPinUnlock();
      }
    }
  }

  Future<void> _onCompleted(String pin) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final lock = context.read<AppLockProvider>();
    final auth = context.read<AuthProvider>();
    final res = await lock.unlockWithPin(pin);
    if (!mounted) return;
    if (res.ok) {
      if (!auth.isAuthenticated) {
        await auth.restoreSessionAfterPinUnlock(
          email: res.email,
          password: res.password,
        );
      }
      return; // overlay disappears
    }
    if (res.remaining <= 0) {
      // Too many wrong attempts: force a full email + password sign-in.
      await lock.clearForSignOut();
      await auth.signOut();
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
    final rawName = (auth.userProfile?.fullName.trim().isNotEmpty == true)
        ? auth.userProfile!.fullName.trim()
        : lock.cachedName.trim();
    final email = (auth.user?.email?.isNotEmpty == true)
        ? auth.user!.email!
        : lock.cachedEmail;
    final greetingName = rawName.isNotEmpty ? rawName.split(' ').first : null;

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
                  email.isNotEmpty
                      ? 'Enter your 6-digit PIN to login as $email'
                      : 'Enter your 6-digit PIN to login',
                  style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 36,
                  child: _error == null
                      ? null
                      : Text(
                          _error!,
                          style: const TextStyle(fontSize: 12.5, color: AppTheme.error),
                          textAlign: TextAlign.center,
                        ),
                ),
                PinPad(
                  key: _padKey,
                  enabled: !_busy,
                  onCompleted: _onCompleted,
                  onBiometric: lock.biometricAvailable
                      ? () async {
                          final ok = await lock.unlockWithBiometric();
                          if (ok && mounted && !auth.isAuthenticated) {
                            await auth.restoreSessionAfterPinUnlock();
                          }
                        }
                      : null,
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () async {
                    await lock.clearForSignOut();
                    await auth.signOut();
                  },
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
