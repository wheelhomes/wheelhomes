# 🏡 Wheelhomes Mobile App

Official cross-platform Flutter application for **Wheelhomes** — bridging modern real estate discovery, artisan service management, real-time messaging, and secure escrow payments.

---

## 📱 Tech Stack & Dependencies

- **Framework:** Flutter (Dart SDK `>=3.0.0 <4.0.0`)
- **State Management:** Provider (`provider: ^6.1.2`)
- **Backend & Database:** Google Firebase
  - **Auth:** `firebase_auth: ^5.5.1`
  - **Database:** `cloud_firestore: ^5.6.5`
  - **Storage:** `firebase_storage: ^12.4.4`
- **UI & Typography:** Google Fonts (Outfit & Inter), Lucide Icons (`lucide_icons_flutter: ^3.1.17`)
- **Media & Photos:** Cloudinary API integration (25GB Free, No Credit Card needed)
- **Payments:** Paystack integration with Escrow Protection Guarantee

---

## ☁️ Free Cloud Image Hosting (Cloudinary - No Credit Card)

Image hosting is configured with **Cloudinary** (25 GB free storage & bandwidth forever):
- **Cloud Name:** `xppp85cc` (Active & Verified ✅)
- **Upload Preset:** `wheelhomes_preset` (Unsigned Mode)
- Configuration file: [lib/core/cloudinary_config.dart](file:///c:/Users/dell/Desktop/wheelhomes/mobile/lib/core/cloudinary_config.dart)

---

## 🚀 Key Implemented Features

### 1. 📸 Photo Uploads & Request Creation (Priority 1)
- **Multi-Source Picker:** Capture live photos via Camera or pick from Gallery.
- **Visual Thumbnail Strip:** Real-time horizontal preview with quick removal badge.
- **Cloud Storage Upload:** Uploads directly to Cloudinary and persists CDN URLs to Firestore.

### 2. 🛠️ Provider Job Marketplace & Agent Listings (Priority 2)
- **Role-Based Provider Hub:**
  - **Available Market:** Open job requests filtered by trade category (Plumbing, Electrical, HVAC, Carpentry, Painting).
  - **Job Claiming:** 1-tap "Accept Job" links the specialist (`providerId`) and notifies the client.
  - **Active Jobs:** Track ongoing dispatches with live status tags.
- **Agent Property Creation:**
  - Dedicated listing flow (`create_property_screen.dart`) with price, specs (beds, baths, sqft), category, and image gallery.
- **💬 Real-Time In-App Chat:**
  - Direct messaging between clients, agents, and specialists tied to specific jobs or properties.

### 3. 🔒 Payment Gateway & Escrow Integration (Priority 3)
- **Wheelhomes Escrow Guarantee:**
  - Upfront deposit is secured in escrow (`paymentStatus: 'escrow_held'`).
  - Specialists commence work knowing funds are locked and guaranteed.
  - Client inspects and approves work before releasing funds (`paymentStatus: 'released'`).
- **Payment Methods:** Debit/Credit Card, Dedicated Virtual Bank Account (Providus Bank / Paystack), and Bank USSD.
- **Receipts & History:** Full transaction audit log and interactive receipt bottom sheets.

### 4. 🔔 Push Notifications & Live Activity Center (Priority 4)
- **Real-Time Notification Feed:** Category chips (*All, Unread, Escrow 🔒, Chat 💬, Jobs 🛠️*).
- **Automated Lifecycle Triggers:**
  - *Specialist Assigned 🛠️* on job acceptance.
  - *Escrow Payment Secured 🔒* on deposit.
  - *Payment Released ✅* upon completion.
- **Dynamic Badge Bell:** Live unread badge count in AppBar header.

---

## 📂 Project Architecture

```
mobile/lib/
├── core/
│   ├── theme.dart             # Wheelhomes design system, typography & palette
│   └── payment_config.dart    # Paystack keys (test/live) & currency config
├── models/
│   ├── user_model.dart        # UserProfile & role entities
│   ├── property_model.dart    # Real estate listings
│   ├── request_model.dart     # Service requests with escrow status & photos
│   ├── chat_model.dart        # ChatMessage & ChatConversation
│   ├── transaction_model.dart # Financial audit logs & references
│   └── notification_model.dart# User alerts with category & payload routing
├── providers/
│   ├── auth_provider.dart     # Authentication & profile state
│   ├── property_provider.dart # Search query & property list state
│   ├── request_provider.dart  # User requests & provider marketplace feeds
│   ├── chat_provider.dart     # Conversation & message streams
│   ├── payment_provider.dart  # Checkout execution & escrow releases
│   └── notification_provider.dart # Unread badge counter & alerts
├── services/
│   ├── auth_service.dart      # Firebase Auth integration
│   ├── firestore_service.dart # Real-time Firestore streams & mutations
│   ├── storage_service.dart   # Image batch uploads to Firebase Storage
│   ├── payment_service.dart   # Escrow payments, references, & Paystack gateway
│   └── notification_service.dart # Alert creation & batch read mutations
├── views/
│   ├── auth/                  # SignIn, SignUp, RoleSelection
│   ├── home/                  # HomeScreen (Explore, Requests, Services, Profile)
│   ├── property/              # PropertyDetail, CreateProperty
│   ├── requests/              # CreateRequest with photo strip
│   ├── chat/                  # ChatScreen, ConversationsScreen
│   ├── payment/               # PaymentCheckoutScreen, PaymentHistoryScreen
│   └── notifications/         # NotificationsScreen with category filters
├── firebase_options.dart      # Platform configurations (Android, iOS, Web)
└── main.dart                  # App bootstrap, MultiProvider, AuthWrapper
```

---

## 🔐 Authentication, Roles & KYC Verification

Users are automatically routed via `AuthWrapper` in `main.dart`:
1. **Unauthenticated** $\rightarrow$ `SignInScreen` / `SignUpScreen`.
2. **New Sign-Up** $\rightarrow$ `RoleSelectionScreen`:
   - **Client**: Books services, browses properties, and funds escrow.
   - **Service Provider / Artisan**: Accesses marketplace to accept and work jobs.
   - **Real Estate Agent**: Lists properties for rent/sale.
3. **Authenticated** $\rightarrow$ `HomeScreen` with dynamic role tabs.

### 🛡️ Identity Verification (KYC) Workflow
Wheelhomes implements smart KYC document upload:
- **Instant Discovery**: Users can create an account and explore the marketplace immediately without friction.
- **Gated Trust Actions**:
  - Service Providers must verify before tapping **"Accept Job"**.
  - Real Estate Agents must verify before tapping **"+ List Property"**.
- **Document Upload Screen (`DocumentUploadScreen`)**:
  - Government ID picker (NIN Slip, Driver's License, International Passport, Voter's Card).
  - Passport photo / headshot selfie camera/gallery capture.
  - Multipart upload to Cloudinary CDN (`wheelhomes/provider_docs`).
  - Recorded in Firestore subcollection `users/{uid}/documents/{docId}` and user metadata `applicationData`.
  - Live status tracking: `unverified` $\rightarrow$ `pending_review` $\rightarrow$ `verified`.

---

## 💳 Paystack Configuration & Testing

Payment configuration is centralized in `lib/core/payment_config.dart`:

```dart
// Switch between Sandbox Test Mode and Live Production:
static const bool isLiveMode = false; // Set true for production

static const String testPublicKey = 'pk_test_...';
static const String livePublicKey = 'pk_live_...';
```

### Paystack Universal Test Card
When `isLiveMode == false`, a **"Fill Paystack Test Card"** button appears in checkout:
- **Card Number:** `4084 0840 8408 4084`
- **Expiry:** `12/28`
- **CVV:** `408`
- **PIN:** `1234`
- **OTP:** `123456`

---

---

## 💻 How to Run the App Yourself (Step-by-Step)

You can run the Wheelhomes mobile app on your local machine using any of the following 3 methods:

### Method 1: Terminal with Live Hot Reload (Recommended for Dev)

1. **Launch the Android Emulator** (if not already running):
   ```powershell
   flutter emulators --launch Pixel_6
   ```
   *(Wait ~30 seconds for Android to boot up).*

2. **Navigate to the Mobile project directory:**
   ```powershell
   cd c:\Users\dell\Desktop\wheelhomes\mobile
   ```

3. **Start the app:**
   ```powershell
   flutter run
   ```
   *(Or target the emulator directly: `flutter run -d emulator-5554`)*

4. **Live Controls while running:**
   - Press **`r`** $\rightarrow$ **Hot Reload** (instantly apply UI/code changes without losing app state).
   - Press **`R`** $\rightarrow$ **Hot Restart** (restart the app from the root widget).
   - Press **`h`** $\rightarrow$ List all available Flutter shortcuts.
   - Press **`q`** $\rightarrow$ Quit and stop the app.

---

### Method 2: 1-Click Run from VS Code / IDE

1. Open the `wheelhomes` workspace in VS Code or Antigravity IDE.
2. In the bottom-right status bar, ensure the target device is set to **`Pixel 6 (android-x64)`** (click it to select if needed).
3. Open `mobile/lib/main.dart`.
4. Press **`F5`** (or go to top menu: **Run $\rightarrow$ Start Debugging**).
5. The debug controls (Play, Pause, Hot Reload, Restart, Stop) will appear at the top.

---

### Method 3: Instant Launch directly on the Emulator Screen

Because the APK is already compiled and installed on your emulator:
1. Bring the **Pixel 6** emulator window to the front.
2. Swipe up from the bottom of the home screen to open the **App Drawer**.
3. Tap the **Wheelhomes** icon (`wheelhomes_mobile`).
4. *Or launch via ADB command line instantly:*
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell monkey -p com.wheelhomes.wheelhomes_mobile -c android.intent.category.LAUNCHER 1
   ```

---

## 🧪 Testing & Verification

Run automated test suite:
```bash
flutter test
```
*Current status: 7/7 tests passing.*

Run static code analysis:
```bash
flutter analyze --no-fatal-infos
```
*Current status: 0 errors.*

---

## 📋 Production Release Checklist

Before submitting to the Google Play Store or Apple App Store:
1. **Paystack Live Keys:** In `lib/core/payment_config.dart`, update `livePublicKey` and set `isLiveMode = true`.
2. **Deploy Firestore Rules:** Deploy `firestore.rules` via Firebase CLI:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```
3. **Android Release Keystore:**
   - Generate signing key:
     ```bash
     keytool -genkey -v -keystore android/app/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
     ```
   - Configure `android/key.properties` and build release bundle:
     ```bash
     flutter build appbundle
     ```
4. **App Icon & Branding:** Replace default Flutter launch icons using `flutter_launcher_icons`.
