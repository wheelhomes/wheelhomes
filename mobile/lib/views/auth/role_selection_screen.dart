import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/design_system/design_system.dart';
import '../../core/app_logo.dart';
import '../../providers/auth_provider.dart';

class RoleSelectionScreen extends StatelessWidget {
  const RoleSelectionScreen({super.key});

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
              const SizedBox(height: 12),
              const AppLogo(height: 50),
              const SizedBox(height: 24),
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

              // Option 1: Client / Resident
              _RoleCard(
                icon: LucideIcons.home,
                title: 'Client / Resident',
                subtitle: 'Hire skilled services, request maintenance, or find homes to buy or rent.',
                color: AppTheme.primary,
                badgeText: 'Client',
                badgeVariant: BrandBadgeVariant.green,
                onTap: () => authProvider.selectRole('user'),
              ),
              const SizedBox(height: 16),

              // Option 2: Service Provider
              _RoleCard(
                icon: LucideIcons.wrench,
                title: 'Service Provider',
                subtitle: 'Offer skilled trades — plumbing, electrical, carpentry, AC repair, etc.',
                color: AppTheme.brandOrange,
                badgeText: 'Provider',
                badgeVariant: BrandBadgeVariant.orange,
                onTap: () => authProvider.selectRole('service_provider'),
              ),
              const SizedBox(height: 16),

              // Option 3: Real Estate Agent
              _RoleCard(
                icon: LucideIcons.building,
                title: 'Real Estate Agent',
                subtitle: 'List apartments, houses, land, and commercial properties.',
                color: AppTheme.slateDark,
                badgeText: 'Agent',
                badgeVariant: BrandBadgeVariant.neutral,
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
  final String? badgeText;
  final BrandBadgeVariant badgeVariant;
  final VoidCallback onTap;

  const _RoleCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    this.badgeText,
    this.badgeVariant = BrandBadgeVariant.green,
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
          boxShadow: AppTheme.cardShadow,
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                      ),
                      if (badgeText != null) ...[
                        const SizedBox(width: 6),
                        BrandBadge(
                          label: badgeText!,
                          variant: badgeVariant,
                          fontSize: 10,
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        ),
                      ],
                    ],
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
            const SizedBox(width: 8),
            const Icon(LucideIcons.chevronRight, color: AppTheme.textSecondary, size: 20),
          ],
        ),
      ),
    );
  }
}
