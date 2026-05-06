import type { AuthUser, UserRole } from "@/types/user";

type ApiErrorBody = {
  detail?: string | unknown[];
  message?: string;
};

function formatError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const d = data as ApiErrorBody;
  if (typeof d.message === "string" && d.message.trim()) {
    return d.message.trim();
  }
  if (typeof d.detail === "string") return d.detail;
  if (Array.isArray(d.detail)) {
    const parts = d.detail
      .map((x) => {
        if (x && typeof x === "object" && "msg" in x && typeof (x as { msg: unknown }).msg === "string") {
          return (x as { msg: string }).msg;
        }
        return null;
      })
      .filter(Boolean) as string[];
    if (parts.length) return parts.join("; ");
  }
  return fallback;
}

export async function register(payload: {
  name: string;
  email: string;
  password: string;
  role: Exclude<UserRole, "admin">;
}): Promise<AuthUser> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatError(data, "Registration failed"));
  }
  return data.user as AuthUser;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatError(data, "Sign in failed"));
  }
  return data.user as AuthUser;
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
