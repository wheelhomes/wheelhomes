import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';

class RoleSelectionScreen extends StatelessWidget {
  const RoleSelectionScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),
              Text(
                'Choose Your Role 🎯',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(
                'How do you plan to use Wheelhomes today?',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 32),

              // Option 1: Client / Homeowner
              _RoleCard(
                icon: LucideIcons.home,
                title: 'Client / Tenant / Buyer',
                subtitle: 'Find properties for rent/sale or hire skilled service providers.',
                color: AppTheme.primary,
                onTap: () => authProvider.selectRole('user'),
              ),
              const SizedBox(height: 16),

              // Option 2: Service Provider
              _RoleCard(
                icon: LucideIcons.wrench,
                title: 'Service Provider / Contractor',
                subtitle: 'Offer home repair, plumbing, electrical, or maintenance services.',
                color: AppTheme.accent,
                onTap: () => authProvider.selectRole('service_provider'),
              ),
              const SizedBox(height: 16),

              // Option 3: Real Estate Agent
              _RoleCard(
                icon: LucideIcons.building,
                title: 'Real Estate Agent',
                subtitle: 'List apartments, land, and commercial properties.',
                color: const Color(0xFF8B5CF6), // Purple accent
                onTap: () => authProvider.selectRole('agent'),
              ),

              const Spacer(),

              if (authProvider.isLoading)
                const Center(child: CircularProgressIndicator())
              else
                Align(
                  alignment: Alignment.center,
                  child: TextButton(
                    onPressed: () => authProvider.signOut(),
                    child: const Text('Sign Out', style: TextStyle(color: AppTheme.error)),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _RoleCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          border: Border.all(color: AppTheme.border, width: 1.5),
          borderRadius: BorderRadius.circular(16),
          color: Colors.white,
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppTheme.textSecondary,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(LucideIcons.chevronRight, color: AppTheme.textSecondary),
          ],
        ),
      ),
    );
  }
}
