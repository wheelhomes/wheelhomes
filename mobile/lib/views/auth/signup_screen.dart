import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({Key? key}) : super(key: key);

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void initState() {
    super.initState();
    _passwordController.addListener(_onPasswordChanged);
  }

  void _onPasswordChanged() {
    setState(() {});
  }

  @override
  void dispose() {
    _passwordController.removeListener(_onPasswordChanged);
    _fullNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  int get _strengthScore {
    final pass = _passwordController.text;
    int score = 0;
    if (pass.length >= 8) score++;
    if (RegExp(r'[A-Z]').hasMatch(pass)) score++;
    if (RegExp(r'[0-9]').hasMatch(pass)) score++;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(pass)) score++;
    return score;
  }

  String get _strengthLabel {
    switch (_strengthScore) {
      case 1:
        return 'Too weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return 'Too weak';
    }
  }

  Color get _strengthColor {
    switch (_strengthScore) {
      case 1:
        return Colors.red;
      case 2:
        return Colors.orange;
      case 3:
        return Colors.amber.shade700;
      case 4:
        return const Color(0xFF10B981);
      default:
        return Colors.red;
    }
  }

  double get _strengthProgress {
    if (_passwordController.text.isEmpty) return 0.0;
    return (_strengthScore / 4).clamp(0.0, 1.0);
  }

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      final pass = _passwordController.text;
      if (pass.length < 8 ||
          !RegExp(r'[A-Z]').hasMatch(pass) ||
          !RegExp(r'[0-9]').hasMatch(pass) ||
          !RegExp(r'[^A-Za-z0-9]').hasMatch(pass)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password must meet format: 8+ chars, 1 uppercase, 1 number, 1 symbol (e.g. 1@Asdmddmdn)'),
            backgroundColor: AppTheme.error,
          ),
        );
        return;
      }

      if (_passwordController.text != _confirmPasswordController.text) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Passwords do not match'),
            backgroundColor: AppTheme.error,
          ),
        );
        return;
      }

      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final success = await authProvider.signUp(
        email: _emailController.text,
        password: _passwordController.text,
        fullName: _fullNameController.text,
        phone: _phoneController.text,
      );

      if (success) {
        if (mounted) Navigator.pop(context);
      } else if (mounted && authProvider.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.errorMessage!),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Create Account'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Join Wheelhomes 🚀',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'Create your account to find properties or offer services.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 28),

                // Full Name
                Text('Full Name', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _fullNameController,
                  decoration: const InputDecoration(
                    hintText: 'John Doe',
                    prefixIcon: Icon(LucideIcons.user, size: 20),
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Please enter your name' : null,
                ),
                const SizedBox(height: 18),

                // Phone
                Text('Phone Number', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    hintText: '+234 800 000 0000',
                    prefixIcon: Icon(LucideIcons.phone, size: 20),
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Please enter phone number' : null,
                ),
                const SizedBox(height: 18),

                // Email
                Text('Email Address', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    hintText: 'name@example.com',
                    prefixIcon: Icon(LucideIcons.mail, size: 20),
                  ),
                  validator: (val) => val == null || !val.contains('@') ? 'Enter a valid email' : null,
                ),
                const SizedBox(height: 18),

                // Password
                Text('Password', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    hintText: 'e.g. 1@Asdmddmdn',
                    prefixIcon: const Icon(LucideIcons.lock, size: 20),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye,
                        size: 20,
                      ),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  validator: (val) {
                    if (val == null || val.length < 8) return 'Minimum 8 characters';
                    if (!RegExp(r'[A-Z]').hasMatch(val)) return 'At least 1 uppercase letter required';
                    if (!RegExp(r'[0-9]').hasMatch(val)) return 'At least 1 number required';
                    if (!RegExp(r'[^A-Za-z0-9]').hasMatch(val)) return 'At least 1 symbol required';
                    return null;
                  },
                ),

                // Password Strength Progress Bar & Format Guide
                if (_passwordController.text.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Password Strength:',
                              style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                            ),
                            Text(
                              _strengthLabel,
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: _strengthColor),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: _strengthProgress,
                            backgroundColor: const Color(0xFFE2E8F0),
                            valueColor: AlwaysStoppedAnimation<Color>(_strengthColor),
                            minHeight: 6,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(child: _buildCheckItem('Min 8 chars', _passwordController.text.length >= 8)),
                            Expanded(child: _buildCheckItem('1 uppercase', RegExp(r'[A-Z]').hasMatch(_passwordController.text))),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Expanded(child: _buildCheckItem('1 number', RegExp(r'[0-9]').hasMatch(_passwordController.text))),
                            Expanded(child: _buildCheckItem('1 symbol', RegExp(r'[^A-Za-z0-9]').hasMatch(_passwordController.text))),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Divider(height: 1, color: Color(0xFFE2E8F0)),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: const [
                            Text('Format example:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                            Text(
                              '1@Asdmddmdn',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, fontFamily: 'monospace', color: Color(0xFF1E293B)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 18),

                // Confirm Password
                Text('Confirm Password', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: _obscureConfirmPassword,
                  decoration: InputDecoration(
                    hintText: 'Re-enter password',
                    prefixIcon: const Icon(LucideIcons.lock, size: 20),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureConfirmPassword ? LucideIcons.eyeOff : LucideIcons.eye,
                        size: 20,
                      ),
                      onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                    ),
                  ),
                  validator: (val) {
                    if (val == null || val.isEmpty) return 'Please confirm your password';
                    if (val != _passwordController.text) return 'Passwords do not match';
                    return null;
                  },
                ),
                const SizedBox(height: 28),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: authProvider.isLoading ? null : _submit,
                    child: authProvider.isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                          )
                        : const Text('Create Account'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCheckItem(String label, bool isMet) {
    return Row(
      children: [
        Icon(
          isMet ? LucideIcons.circleCheck : LucideIcons.circle,
          size: 14,
          color: isMet ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isMet ? FontWeight.w600 : FontWeight.normal,
            color: isMet ? const Color(0xFF047857) : const Color(0xFF64748B),
          ),
        ),
      ],
    );
  }
}
