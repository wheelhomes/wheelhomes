import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';

import 'core/theme.dart';
import 'firebase_options.dart';
import 'providers/auth_provider.dart';
import 'providers/property_provider.dart';
import 'providers/request_provider.dart';
import 'providers/chat_provider.dart';
import 'providers/payment_provider.dart';
import 'providers/notification_provider.dart';
import 'views/auth/signin_screen.dart';
import 'views/auth/role_selection_screen.dart';
import 'views/home/home_screen.dart';
import 'views/verification/document_upload_screen.dart';
import 'views/verification/pending_approval_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Try initializing Firebase
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (e) {
    debugPrint('Firebase initialization warning: $e');
  }

  runApp(const WheelhomesApp());
}

class WheelhomesApp extends StatelessWidget {
  const WheelhomesApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => PropertyProvider()),
        ChangeNotifierProvider(create: (_) => RequestProvider()),
        ChangeNotifierProvider(create: (_) => ChatProvider()),
        ChangeNotifierProvider(create: (_) => PaymentProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
      ],
      child: MaterialApp(
        title: 'Wheelhomes',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const AuthWrapper(),
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    // ── Step 1: Not logged in → Sign In
    if (!authProvider.isAuthenticated) {
      return const SignInScreen();
    }

    final profile = authProvider.userProfile;

    // ── Step 2: No profile yet or hasn't picked a role → Role Selection
    if (profile == null || profile.role == 'pending_role_selection') {
      return const RoleSelectionScreen();
    }

    // ── Step 3: Service Provider Verification Gating ──
    // If a service provider's KYC application was rejected by the admin or is
    // pending review, route them directly to PendingApprovalScreen so they can see
    // the status, review the admin's rejection reason, and update their documents.
    if (profile.role == 'service_provider') {
      if (profile.isRejected || profile.isPendingReview) {
        return const PendingApprovalScreen();
      } else if (!profile.isVerified) {
        return const DocumentUploadScreen();
      }
    }

    // ── Step 4: Agent Verification Gating ──
    if (profile.role == 'agent') {
      if (profile.isRejected || profile.isPendingReview) {
        return const PendingApprovalScreen();
      }
    }

    // ── Step 5: Approved Users, Agents & Clients → Home Screen ──
    return const HomeScreen();
  }
}

