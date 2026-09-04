/** Full page load so dashboard client state cannot leak across accounts. */
export function hardNavigate(path: string, locale: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  window.location.assign(`/${locale}${clean}`);
}
