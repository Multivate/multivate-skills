export type UserRole = "student" | "instructor" | "mentor" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  two_factor_enabled?: boolean;
  authenticator_enabled?: boolean;
  avatar_url?: string | null;
  preferred_locale?: string | null;
  profile_public?: boolean;
  public_slug?: string | null;
  public_headline?: string | null;
  public_bio?: string | null;
  created_at: string;
};

export type LoginMfaChallenge = {
  mfaRequired: true;
  mfaToken: string;
  emailMasked: string;
  devOtp?: string;
};

export type LoginOutcome = AuthUser | LoginMfaChallenge;
