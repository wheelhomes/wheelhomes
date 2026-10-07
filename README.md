# 🏡 Wheelhomes Platform

The complete PropTech ecosystem for real estate discovery, mobile living, artisan service booking, and secure escrow management.

---

## 🏗️ Architecture Overview

The Wheelhomes platform consists of two unified applications powered by a shared **Google Cloud Firebase** backend:

```
wheelhomes/
├── app/                  # Next.js 16 Web Application & Admin Operations Control Panel
├── mobile/               # Flutter Cross-Platform Mobile Application (Android / iOS)
├── components/           # Reusable Web UI components (Design System & UnifiedChat)
├── lib/                  # Shared web utilities & Firebase client configuration
├── firestore.rules       # Cloud Firestore Security Rules (RBAC, Chat & Escrow)
└── README.md             # Project documentation
```

---

## ⚡ Quick Start: Running the Applications

### 1. Web Application & Admin Control Panel (Next.js)

The web application runs from the project **root directory**:

```bash
# 1. Install dependencies
npm install

# 2. Start the local Next.js development server
npm run dev
```

* **Client Marketplace:** [http://localhost:3000](http://localhost:3000)
* **Admin Control Center:** [http://localhost:3000/admin](http://localhost:3000/admin)

#### 🔐 Official Admin Login Credentials:
* **Email:** `admin@wheelhomes.com`
* **Password:** `admin123456`

---

### 2. Mobile Application (Flutter)

> ⚠️ **Important:** Flutter commands **must** be executed from inside the **`mobile/`** subfolder, not the root workspace!

```bash
# 1. Navigate into the mobile project directory
cd mobile

# 2. Check connected devices and emulators
flutter devices

# 3. Fetch Dart & Flutter dependencies
flutter pub get

# 4. Start the application on your running emulator or phone
flutter run

# To target a specific emulator explicitly (e.g. emulator-5554):
flutter run -d emulator-5554
```

#### ⌨️ Flutter Terminal Shortcuts:
* Press **`r`** &rarr; **Hot Reload** (instant UI updates without restarting state)
* Press **`R`** &rarr; **Hot Restart** (re-initializes app state)
* Press **`q`** &rarr; Quit / Stop app

---

## 📱 Mobile App Key Capabilities

* **Dual-Role Experience:**
  * **Clients / Tenants:** Search properties, browse artisan services, book specialists with location and photos, in-app real-time chat, and escrow deposit checkout.
  * **Service Providers:** Real-time job request feed, accept/claim jobs, track dispatch states (*Pending* &rarr; *In Progress* &rarr; *Upload Proof Photo* &rarr; *Completed*).
* **KYC Identity Verification:**
  * Native camera and photo picker for uploading **Government ID (NIN, Driver's License, Voter's Card)** and **Passport Photograph**.
* **Escrow Protection:**
  * Paystack integration ensuring client deposits remain locked in escrow until the artisan's work is verified and approved.

---

## 🛡️ Admin Operations Control Center (`/admin`)

The Admin Panel features 6 core modules:

1. **Dashboard Overview (`/admin/dashboard`):** Real-time telemetry, active provider counts, pending verification counters, property inventory, and escrow volume.
2. **User Management (`/admin/users`):** Platform-wide account registry with filters for *Active Members*, *Pending KYC*, and direct jump links to verification.
3. **Provider Approvals (`/admin/approvals`):** Dedicated KYC verification hub. Inspect applicant Government IDs, passport photos, and trade capabilities for both **Web (`🌐`)** and **Mobile (`📱`)** submissions, with one-click **Approve & Publish** or **Request Changes**.
4. **Property Moderation (`/admin/properties`):** Complete listing moderation, image galleries, status controls, and "Featured Property" switches.
5. **Unified Service Requests (`/admin/requests`):** Single unified inbox aggregating Web jobs (`job_requests`) and Mobile jobs (`requests`) with channel badges, attached photos, and live audit chat.
6. **Transactions & Escrow Audit (`/admin/transactions`):** Full telemetry on Paystack references, escrow vaults, and one-click escrow release to artisans upon confirmed delivery.

---

## ☁️ Firebase Configuration & Security Rules

* **Project ID:** `wheelhomes`
* **Rules File:** [`firestore.rules`](file:///c:/Users/dell/Desktop/wheelhomes/firestore.rules)
* **Cloud Security Deployment:** Copy the contents of [`firestore.rules`](file:///c:/Users/dell/Desktop/wheelhomes/firestore.rules) into the **Firebase Console &rarr; Firestore Database &rarr; Rules** tab and click **Publish** to enforce full super-admin and marketplace access.
