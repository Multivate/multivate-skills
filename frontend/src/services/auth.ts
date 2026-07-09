import type { AuthUser, LoginOutcome } from "@/types/user";

export type StudentLearningProfileRegistrationPayload = {
  education_level: string;
  current_skills: string | null;
  skills_to_learn: string;
  learning_goals: string | null;
  preferred_formats: string;
  weekly_hours: string;
  career_direction: string | null;
  extra_notes: string | null;
};

export type InstructorTeachingProfileRegistrationPayload = {
  expertise_areas: string;
  teaching_bio: string | null;
  subjects_taught: string | null;
  years_experience: string;
  teaching_formats: string;
  credentials_notes: string | null;
  professional_links: string | null;
};

export type RegisterPayload =
  | {
      role: "student";
      name: string;
      email: string;
      password: string;
      learning_profile: StudentLearningProfileRegistrationPayload;
    }
  | {
      role: "instructor";
      name: string;
      email: string;
      password: string;
      teaching_profile: InstructorTeachingProfileRegistrationPayload;
    }
  | {
      role: "mentor";
      name: string;
      email: string;
      password: string;
    };

type ApiErrorBody = {
  detail?: string | unknown[];
  message?: string;
  debug?: unknown;
  request_id?: string;
};

function formatError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const d = data as ApiErrorBody;
  let out: string;
  if (typeof d.message === "string" && d.message.trim()) {
    out = d.message.trim();
  } else if (typeof d.detail === "string") {
    out = d.detail;
  } else if (Array.isArray(d.detail)) {
    const parts = d.detail
      .map((x) => {
        if (x && typeof x === "object" && "msg" in x && typeof (x as { msg: unknown }).msg === "string") {
          return (x as { msg: string }).msg;
        }
        return null;
      })
      .filter(Boolean) as string[];
    out = parts.length ? parts.join("; ") : fallback;
  } else {
    out = fallback;
  }
  if (process.env.NODE_ENV === "development") {
    const extra: string[] = [];
    if (d.debug != null) {
      const dbg = typeof d.debug === "string" ? d.debug : String(d.debug);
      if (dbg) extra.push(dbg.length > 480 ? `${dbg.slice(0, 480)}…` : dbg);
    }
    if (typeof d.request_id === "string" && d.request_id.trim()) {
      extra.push(`request_id=${d.request_id.trim()}`);
    }
    if (extra.length) out = `${out} (${extra.join(" · ")})`;
  }
  return out;
}

export type RegisterStartResult = {
  signup_token: string;
  email_masked: string;
  dev_otp?: string;
};

export async function registerStart(payload: RegisterPayload): Promise<RegisterStartResult> {
  const path =
    payload.role === "instructor"
      ? "/api/auth/register/instructor/start"
      : payload.role === "mentor"
        ? "/api/auth/register/mentor/start"
        : "/api/auth/register/student/start";
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatError(data, "Could not start registration"));
  }
  const signup_token = typeof data.signup_token === "string" ? data.signup_token : "";
  const email_masked = typeof data.email_masked === "string" ? data.email_masked : "";
  if (!signup_token) {
    throw new Error("Invalid response from server");
  }
  const devOtp = typeof data.dev_otp === "string" && /^\d{6}$/.test(data.dev_otp) ? data.dev_otp : undefined;
  return { signup_token, email_masked, ...(devOtp ? { dev_otp: devOtp } : {}) };
}

export async function registerVerify(
  role: "student" | "instructor" | "mentor",
  signupToken: string,
  code: string,
): Promise<AuthUser> {
  const path =
    role === "instructor"
      ? "/api/auth/register/instructor/verify"
      : role === "mentor"
        ? "/api/auth/register/mentor/verify"
        : "/api/auth/register/student/verify";
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ signup_token: signupToken, code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatError(data, "Verification failed"));
  }
  return data.user as AuthUser;
}

export async function login(email: string, password: string): Promise<LoginOutcome> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403 && data && typeof data === "object" && (data as ApiErrorBody).detail === "profile_incomplete") {
      throw new Error("PROFILE_INCOMPLETE");
    }
    throw new Error(formatError(data, "Sign in failed"));
  }
  if (data && typeof data === "object" && (data as { mfa_required?: unknown }).mfa_required === true) {
    const d = data as { mfa_token?: string; email_masked?: string; dev_otp?: string | null };
    if (typeof d.mfa_token === "string") {
      const devOtp = typeof d.dev_otp === "string" && /^\d{6}$/.test(d.dev_otp) ? d.dev_otp : undefined;
      return {
        mfaRequired: true,
        mfaToken: d.mfa_token,
        emailMasked: typeof d.email_masked === "string" ? d.email_masked : "",
        ...(devOtp ? { devOtp } : {}),
      };
    }
  }
  return data.user as AuthUser;
}

export async function completeMfaLogin(mfaToken: string, code: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/mfa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ mfa_token: mfaToken, code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatError(data, "Verification failed"));
  }
  return data.user as AuthUser;
}

export async function resendMfaLogin(mfaToken: string): Promise<{ mfaToken: string; emailMasked: string; devOtp?: string }> {
  const res = await fetch("/api/auth/login/mfa/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ mfa_token: mfaToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatError(data, "We couldn't send a new code"));
  }
  const token = typeof data.mfa_token === "string" ? data.mfa_token : "";
  if (!token) {
    throw new Error("Invalid response from server");
  }
  const devOtp = typeof data.dev_otp === "string" && /^\d{6}$/.test(data.dev_otp) ? data.dev_otp : undefined;
  return {
    mfaToken: token,
    emailMasked: typeof data.email_masked === "string" ? data.email_masked : "",
    ...(devOtp ? { devOtp } : {}),
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) return null;
  return (await res.json()) as AuthUser;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}
