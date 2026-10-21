import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../core/design_system/design_system.dart';

class AppUpdateInfo {
  final String latestVersion;
  final int latestBuildNumber;
  final String minRequiredVersion;
  final String downloadUrl;
  final String releaseNotes;
  final bool forceUpdate;

  const AppUpdateInfo({
    required this.latestVersion,
    required this.latestBuildNumber,
    required this.minRequiredVersion,
    required this.downloadUrl,
    required this.releaseNotes,
    required this.forceUpdate,
  });

  factory AppUpdateInfo.fromFirestore(Map<String, dynamic> data) {
    return AppUpdateInfo(
      latestVersion: data['latestVersion'] as String? ?? '1.0.0',
      latestBuildNumber: (data['latestBuildNumber'] as num?)?.toInt() ?? 1,
      minRequiredVersion: data['minRequiredVersion'] as String? ?? '1.0.0',
      downloadUrl: data['downloadUrl'] as String? ?? 'https://wheelhomes.com/downloads/wheelofcomfort.apk',
      releaseNotes: data['releaseNotes'] as String? ?? 'Performance improvements and bug fixes.',
      forceUpdate: data['forceUpdate'] as bool? ?? false,
    );
  }
}

class UpdateService {
  // Current app version matching pubspec.yaml
  static const String currentVersion = '1.0.0';
  static const int currentBuildNumber = 1;

  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Compares semantic versions (e.g. '1.0.1' > '1.0.0')
  static bool isVersionNewer(String remote, String current) {
    try {
      final remoteParts = remote.split('.').map(int.parse).toList();
      final currentParts = current.split('.').map(int.parse).toList();

      for (int i = 0; i < 3; i++) {
        final r = i < remoteParts.length ? remoteParts[i] : 0;
        final c = i < currentParts.length ? currentParts[i] : 0;
        if (r > c) return true;
        if (r < c) return false;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Checks Firestore `app_config/mobile` with HTTP fallback to `/api/version`
  static Future<AppUpdateInfo?> checkForUpdate() async {
    // 1. Primary Source: Cloud Firestore `app_config/mobile`
    try {
      final doc = await _firestore.collection('app_config').doc('mobile').get();
      if (doc.exists && doc.data() != null) {
        final info = AppUpdateInfo.fromFirestore(doc.data()!);
        final hasNewerVersion = isVersionNewer(info.latestVersion, currentVersion);
        final hasNewerBuild = info.latestBuildNumber > currentBuildNumber;

        if (hasNewerVersion || hasNewerBuild) {
          return info;
        }
        return null;
      }
    } catch (e) {
      debugPrint('[UpdateService] Firestore check notice: $e');
    }

    // 2. Secondary Fallback Source: Web API `/api/version`
    try {
      final res = await http.get(
        Uri.parse('https://wheelhomes.com/api/version'),
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        if (json.containsKey('mobile') && json['mobile'] is Map) {
          final mInfo = AppUpdateInfo.fromFirestore(Map<String, dynamic>.from(json['mobile']));
          final hasNewerVersion = isVersionNewer(mInfo.latestVersion, currentVersion);
          final hasNewerBuild = mInfo.latestBuildNumber > currentBuildNumber;

          if (hasNewerVersion || hasNewerBuild) {
            return mInfo;
          }
        }
      }
    } catch (e) {
      debugPrint('[UpdateService] HTTP check notice (ignored): $e');
    }

    return null;
  }

  /// Checks and prompts user with an update modal if an update is available.
  static Future<void> checkAndPromptUpdate(
    BuildContext context, {
    bool isManualCheck = false,
  }) async {
    final updateInfo = await checkForUpdate();

    if (!context.mounted) return;

    if (updateInfo == null) {
      if (isManualCheck) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('You are using the latest version of Wheelhomes (v$currentVersion) 🎉'),
            backgroundColor: AppTheme.accent,
            duration: Duration(seconds: 3),
          ),
        );
      }
      return;
    }

    // Determine if update is mandatory
    final isMandatory = updateInfo.forceUpdate ||
        isVersionNewer(updateInfo.minRequiredVersion, currentVersion);

    showDialog(
      context: context,
      barrierDismissible: !isMandatory,
      builder: (ctx) {
        return PopScope(
          canPop: !isMandatory,
          child: Dialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            elevation: 16,
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.arrowUpCircle, size: 36, color: AppTheme.primary),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    isMandatory ? 'Mandatory Update ⚡' : 'Update Available! 🚀',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Wheelhomes v${updateInfo.latestVersion} is now ready for download.',
                    style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),

                  // Release notes box
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.background,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "What's New:",
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          updateInfo.releaseNotes,
                          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Action Buttons
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        final uri = Uri.parse(updateInfo.downloadUrl);
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        } else {
                          if (ctx.mounted) {
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              const SnackBar(content: Text('Could not open download link.')),
                            );
                          }
                        }
                      },
                      icon: const Icon(LucideIcons.download, size: 18),
                      label: const Text('Download Update', style: TextStyle(fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),

                  if (!isMandatory) ...[
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Later', style: TextStyle(color: AppTheme.textSecondary)),
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
