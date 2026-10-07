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

  /// Roles that require KYC verification before accessing the app.
  static const _kycRequiredRoles = {'service_provider', 'agent'};

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

    // ── Step 3: For roles that require KYC (service_provider, agent),
    //    gate access based on their verification status.
    if (_kycRequiredRoles.contains(profile.role)) {
      switch (profile.status) {
        case 'approved':
        case 'verified':
          // ✅ Fully verified — allow into the main app
          break;

        case 'pending_review':
          // ⏳ Documents submitted, awaiting admin review
          return const PendingApprovalScreen();

        case 'rejected':
        case 'restricted':
          // ❌ Documents rejected — need to re-upload
          return const DocumentUploadScreen();

        case 'unverified':
        default:
          // 🛡️ Haven't submitted documents yet — must upload KYC
          return const DocumentUploadScreen();
      }
    }

    // ── Step 4: All checks passed → Home Screen
    return const HomeScreen();
  }
}

