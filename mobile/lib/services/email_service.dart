import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Service for dispatching transactional email notifications via the secure backend API.
/// No API keys or sensitive credentials are stored on the mobile client.
class EmailService {
  /// Base Web Platform URL (defaults to production domain)
  static const String appBaseUrl = String.fromEnvironment(
    'APP_BASE_URL',
    defaultValue: 'https://wheelofcomfort.vercel.app',
  );

  /// Dispatches the "Successful Onboarding — Account Under Review" confirmation email
  /// via the backend API route (/api/notify-pending-review).
  static Future<bool> sendPendingReviewNotification({
    required String email,
    required String name,
    String? uid,
    http.Client? client,
  }) async {
    final cleanEmail = email.trim();
    final cleanName = name.trim().isEmpty ? 'Valued Partner' : name.trim();

    if (cleanEmail.isEmpty) {
      debugPrint('[EmailService] Empty recipient email, skipping notification.');
      return false;
    }

    try {
      final httpClient = client ?? http.Client();
      final uri = Uri.parse('$appBaseUrl/api/notify-pending-review');

      final response = await httpClient.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'uid': uid,
          'email': cleanEmail,
          'name': cleanName,
        }),
      );

      final success = response.statusCode >= 200 && response.statusCode < 300;
      if (success) {
        debugPrint('[EmailService] Successfully requested pending review email via backend.');
      } else {
        debugPrint('[EmailService] Backend responded with status ${response.statusCode}: ${response.body}');
      }
      return success;
    } catch (e) {
      debugPrint('[EmailService] Failed to dispatch email via backend API: $e');
      return false;
    }
  }
}
