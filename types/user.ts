export interface ApplicationData {
    // Service Provider Data
    serviceCategory?: string;
    services?: string[]; // Multi-select support
    experience?: string;
    coverageArea?: string; // Kept for providers

    // Identity Verification (Shared)
    govIdUrl?: string; // Base64
    passportUrl?: string; // Base64

    // Status tracking
    submittedAt?: string;
    rejectedDocs?: string[]; // 'govId' | 'passport'
}

export interface UserProfile {
    uid: string;
    email: string;
    fullName: string;
    phone: string;
    businessName?: string;

    role: 'user' | 'service_provider' | 'agent' | 'admin' | 'pending_role_selection' | string;
    status: 'unverified' | 'pending_review' | 'pending' | 'approved' | 'rejected' | 'restricted' | 'verified' | string;

    // Personal Details (User Onboarding)
    gender?: string;
    dob?: string;
    address?: {
        street: string;
        city: string;
        state: string;
    };
    accountType?: 'home_owner' | 'tenant';

    // Application Data (for verification)
    applicationData?: ApplicationData;

    createdAt: string;
    lastLoginAt?: string;
    customId?: string; // SP-XXXXX
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
}
