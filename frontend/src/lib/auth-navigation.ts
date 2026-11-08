/** Full page load so dashboard client state cannot leak across accounts. */
export function hardNavigate(path: string, locale: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  window.location.assign(`/${locale}${clean}`);
}

/** Canonical home for each account type. Admin and instructor are separate apps. */
export function homeForRole(role: string | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "instructor") return "/instructor";
  return "/dashboard";
}

/**
 * Honor a deep link when it belongs to this role.
 * Generic /dashboard sends each role to its own home.
 */
export function resolvePostLoginPath(role: string | undefined, from: string): string {
  const home = homeForRole(role);
  const path = from.startsWith("/") ? from : home;

  if (path.startsWith("/dashboard/admin")) {
    return role === "admin" ? path.replace("/dashboard/admin", "/admin") : home;
  }
  if (path.startsWith("/dashboard/instructor")) {
    return role === "instructor" ? path.replace("/dashboard/instructor", "/instructor") : home;
  }
  if (path.startsWith("/admin")) return role === "admin" ? path : home;
  if (path.startsWith("/instructor")) return role === "instructor" ? path : home;
  if (path === "/" || path === "/dashboard" || path.startsWith("/login") || path.startsWith("/register")) {
    return home;
  }
  return path;
}
