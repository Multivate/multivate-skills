export const THEME_KEY = "multivate_theme";
export const LEGACY_THEME_KEY = "multivate_admin_theme";

export type ThemeChoice = "light" | "dark" | "system";

const THEME_APP_PATH = "/(dashboard|admin|instructor|learn)(/|$)";

export const THEME_BOOT_SCRIPT = `(function(){try{var k=localStorage.getItem("${THEME_KEY}")||localStorage.getItem("${LEGACY_THEME_KEY}")||"light";var d=k==="dark"||(k==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var p=location.pathname.replace(/^\\/(en|fr|de|es)(?=\\/|$)/,"")||"/";var app=/${THEME_APP_PATH.replace(/\//g, "\\/")}/.test(p);document.documentElement.classList.toggle("dark",!!(d&&app));}catch(e){}})();`;

export function isThemedAppPath(pathname: string): boolean {
  const path = pathname.replace(/^\/(en|fr|de|es)(?=\/|$)/, "") || "/";
  return /^\/(dashboard|admin|instructor|learn)(\/|$)/.test(path);
}

export function readStoredTheme(): ThemeChoice {
  try {
    const saved = window.localStorage.getItem(THEME_KEY) || window.localStorage.getItem(LEGACY_THEME_KEY);
    if (saved === "dark" || saved === "light" || saved === "system") return saved;
  } catch {
    /* ignore */
  }
  return "light";
}

export function writeStoredTheme(choice: ThemeChoice) {
  window.localStorage.setItem(THEME_KEY, choice);
  window.localStorage.setItem(LEGACY_THEME_KEY, choice);
}

export function resolveDark(choice: ThemeChoice, systemDark: boolean) {
  return choice === "system" ? systemDark : choice === "dark";
}

export function applyDocumentTheme(dark: boolean, pathname?: string) {
  const onApp = isThemedAppPath(pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/"));
  document.documentElement.classList.toggle("dark", Boolean(dark && onApp));
}
