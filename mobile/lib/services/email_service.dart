import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';

/// Service for dispatching transactional email notifications via the secure backend API.
/// No API keys or sensitive credentials are stored on the mobile client.
class EmailService {
  /// Base Web Platform URL (defaults to production domain)
  static const String appBaseUrl = String.fromEnvironment(
    'APP_BASE_URL',
    defaultValue: 'https://wheelofcomfort.vercel.app',
  );

  /// Builds request headers including the signed-in user's Firebase ID token.
  static Future<Map<String, String>> _authHeaders() async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    try {
      final token = await FirebaseAuth.instance.currentUser?.getIdToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    } catch (_) {}
    return headers;
  }

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
        headers: await _authHeaders(),
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

  /// Dispatches the 6-digit email verification code and activation link via the backend API
  static Future<bool> sendVerificationEmail({
    required String email,
    required String code,
    required String name,
    required String uid,
    http.Client? client,
  }) async {
    final cleanEmail = email.trim();
    final cleanCode = code.trim();
    if (cleanEmail.isEmpty || cleanCode.isEmpty) return false;

    try {
      final httpClient = client ?? http.Client();
      final uri = Uri.parse('$appBaseUrl/api/auth/send-verification-email');

      final response = await httpClient.post(
        uri,
        headers: await _authHeaders(),
        body: jsonEncode({
          'uid': uid,
          'email': cleanEmail,
          'code': cleanCode,
          'name': name.trim().isEmpty ? 'User' : name.trim(),
        }),
      );

      final success = response.statusCode >= 200 && response.statusCode < 300;
      if (success) {
        debugPrint('[EmailService] Verification email sent to $cleanEmail');
      } else {
        debugPrint('[EmailService] Failed to send verification email: ${response.body}');
      }
      return success;
    } catch (e) {
      debugPrint('[EmailService] Failed to send verification email: $e');
      return false;
    }
  }

  /// Verifies a 6-digit OTP code securely via the backend API
  static Future<bool> verifyOtp({
    required String code,
    http.Client? client,
  }) async {
    final cleanCode = code.trim().replaceAll(' ', '');
    if (cleanCode.length != 6) return false;

    try {
      final httpClient = client ?? http.Client();
      final uri = Uri.parse('$appBaseUrl/api/auth/verify-otp');

      final response = await httpClient.post(
        uri,
        headers: await _authHeaders(),
        body: jsonEncode({'code': cleanCode}),
      );

      final success = response.statusCode >= 200 && response.statusCode < 300;
      if (success) {
        debugPrint('[EmailService] OTP verified successfully.');
        return true;
      } else {
        debugPrint('[EmailService] Failed to verify OTP (${response.statusCode}): ${response.body}');
        String? serverError;
        try {
          final data = jsonDecode(response.body);
          serverError = data['error'] ?? data['message'];
        } catch (_) {}
        throw Exception(serverError ?? 'Verification failed (${response.statusCode})');
      }
    } catch (e) {
      debugPrint('[EmailService] Failed to verify OTP via backend: $e');
      rethrow;
    }
  }

  /// Requests a newly generated 6-digit verification code from the server
  static Future<bool> requestVerificationOtp({
    String? email,
    String? name,
    http.Client? client,
  }) async {
    try {
      final httpClient = client ?? http.Client();
      final uri = Uri.parse('$appBaseUrl/api/auth/send-verification-email');

      final currentUser = FirebaseAuth.instance.currentUser;
      final targetEmail = email ?? currentUser?.email ?? '';

      final response = await httpClient.post(
        uri,
        headers: await _authHeaders(),
        body: jsonEncode({
          'email': targetEmail,
          if (name != null && name.trim().isNotEmpty) 'name': name.trim(),
        }),
      );

      final success = response.statusCode >= 200 && response.statusCode < 300;
      if (success) {
        debugPrint('[EmailService] Verification code requested successfully.');
        return true;
      } else {
        debugPrint('[EmailService] Failed to request verification code (${response.statusCode}): ${response.body}');
        String? serverError;
        try {
          final data = jsonDecode(response.body);
          serverError = data['error'] ?? data['message'];
        } catch (_) {}
        throw Exception(serverError ?? 'Failed to request verification code (${response.statusCode})');
      }
    } catch (e) {
      debugPrint('[EmailService] Failed to request verification code: $e');
      rethrow;
    }
  }
}

