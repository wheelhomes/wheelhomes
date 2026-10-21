import { User } from "firebase/auth";

export interface UserAuthProfile {
    role?: string;
    status?: string;
    emailVerified?: boolean;
    fullName?: string;
    verificationOtp?: any;
    [key: string]: any;
}

/**
 * Universally determines if a user's email is considered verified across the Wheelhomes ecosystem.
 * Handles native Firebase Auth tokens, Firestore Brevo OTP verification records, and lifecycle statuses.
 */
export function isEmailVerifiedGlobally(
    user: User | null | undefined,
    profileData: UserAuthProfile | null | undefined
): boolean {
    if (!user && !profileData) return false;

    // 1. Direct native Firebase Auth flag
    if (user?.emailVerified === true) return true;

    // 2. Explicit Firestore emailVerified flag
    if (profileData?.emailVerified === true) return true;

    // 3. Status-based inference: if user has progressed to verified, pending_review, or approved,
    // their email was inherently verified at step 1 of onboarding.
    const status = (profileData?.status || '').toLowerCase();
    if (
        status === 'verified' ||
        status === 'pending_review' ||
        status === 'pending' ||
        status === 'approved'
    ) {
        return true;
    }

    // 4. If user already selected a role (e.g. 'service_provider', 'agent', 'user')
    // and is in subsequent onboarding steps (where status may be 'unverified')
    const role = profileData?.role;
    if (role && role !== 'pending_role_selection') {
        // If OTP is cleared, they are verified
        if (profileData?.verificationOtp === null || profileData?.verificationOtp === undefined) {
            return true;
        }
    }

    return false;
}

/**
 * Returns the exact destination route for an authenticated user based on their role and verification state.
 * Guaranteed to produce identical, loop-free routing across all web pages.
 */
export function resolveUserDestination(
    user: User | null | undefined,
    profileData: UserAuthProfile | null | undefined
): string {
    if (!user) return "/signin";

    const role = profileData?.role;
    const status = (profileData?.status || '').toLowerCase();

    // 1. Admin portal (always bypass client email checks)
    if (role === 'admin') {
        return "/admin/dashboard";
    }

    // 2. Email verification gating
    if (!isEmailVerifiedGlobally(user, profileData)) {
        return "/verify-email";
    }

    // 3. Rejected or Restricted accounts
    if (status === 'rejected' || status === 'restricted') {
        if (role === 'service_provider') {
            return "/dashboard/pending";
        }
        return "/settings/verification";
    }

    // 4. Role Selection gating: if no role chosen yet
    if (!role || role === 'pending_role_selection') {
        return "/role-selection";
    }

    // 5. Service Provider gating
    if (role === 'service_provider') {
        if (status === 'approved') return "/dashboard/provider";
        if (status === 'pending_review' || status === 'pending' || status === 'rejected') return "/dashboard/pending";
        return "/register/provider"; // In-progress onboarding / KYC
    }

    // 6. Real Estate Agent gating
    if (role === 'agent') {
        if (status === 'approved') return "/dashboard/agent";
        return "/dashboard/pending";
    }

    // 7. Regular Client (role === 'user')
    if (status === 'pending_review' || status === 'pending') {
        return "/dashboard/pending";
    }
    if (status === 'unverified') {
        return "/onboarding/profile";
    }
    return "/dashboard/user";
}
