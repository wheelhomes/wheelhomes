import 'package:firebase_auth/firebase_auth.dart';

/// Helper to transform raw Firebase technical error messages into
/// friendly, empathetic, and human-readable feedback for users.
class AuthErrorHelper {
  static String format(dynamic error) {
    if (error == null) {
      return 'An unexpected error occurred. Please try again.';
    }

    if (error is FirebaseAuthException) {
      switch (error.code.toLowerCase()) {
        case 'invalid-credential':
        case 'wrong-password':
        case 'user-not-found':
          return 'Incorrect email or password. Please verify your details and try again.';
        case 'invalid-email':
          return 'Please enter a valid email address.';
        case 'user-disabled':
          return 'This account has been deactivated. Please contact Wheelhomes support.';
        case 'too-many-requests':
          return 'Too many unsuccessful attempts. Please wait a few moments before trying again.';
        case 'email-already-in-use':
          return 'An account with this email already exists. Try signing in instead.';
        case 'weak-password':
          return 'Your password is too weak. Please choose a stronger password.';
        case 'network-request-failed':
          return 'Network error. Please check your internet connection and try again.';
        case 'operation-not-allowed':
          return 'Sign-in with this method is currently disabled.';
        case 'requires-recent-login':
          return 'For security, please sign in again before completing this action.';
        default:
          final msg = error.message;
          if (msg != null && msg.trim().isNotEmpty) {
            return _sanitize(msg);
          }
          return 'Authentication failed. Please check your details and try again.';
      }
    }

    // If it's a String or other exception type
    String raw = error.toString();
    final lower = raw.toLowerCase();

    if (lower.contains('invalid-credential') ||
        lower.contains('wrong password') ||
        lower.contains('user not found') ||
        lower.contains('invalid credential')) {
      return 'Incorrect email or password. Please verify your details and try again.';
    }

    if (lower.contains('email-already-in-use') || lower.contains('already in use')) {
      return 'An account with this email already exists. Try signing in instead.';
    }

    if (lower.contains('network-request-failed') || lower.contains('network error') || lower.contains('socketexception')) {
      return 'Network connection issue. Please check your internet and try again.';
    }

    if (lower.contains('too-many-requests')) {
      return 'Too many attempts. Please pause for a moment and try again.';
    }

    return _sanitize(raw);
  }

  static String _sanitize(String text) {
    // Strip [firebase_auth/...] tags and raw bracket prefixes
    String cleaned = text.replaceAll(RegExp(r'\[.*?\]\s*'), '').trim();
    if (cleaned.isEmpty || cleaned.toLowerCase().contains('exception:')) {
      cleaned = cleaned.replaceAll(RegExp(r'^exception:\s*', caseSensitive: false), '').trim();
    }
    if (cleaned.isEmpty) {
      return 'Something went wrong. Please check your information and try again.';
    }
    // Capitalize first letter if not already
    return cleaned[0].toUpperCase() + cleaned.substring(1);
  }
}
