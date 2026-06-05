export type UserRole = "student" | "instructor" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  two_factor_enabled?: boolean;
  avatar_url?: string | null;
  created_at: string;
};

export type LoginMfaChallenge = {
  mfaRequired: true;
  mfaToken: string;
  emailMasked: string;
  /** Present in local dev when API has no Resend key — same 6-digit code as email would contain */
  devOtp?: string;
};

export type LoginOutcome = AuthUser | LoginMfaChallenge;
