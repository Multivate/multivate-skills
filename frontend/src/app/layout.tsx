import localFont from "next/font/local";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { THEME_BOOT_SCRIPT } from "@/lib/appearance";
import { routing } from "@/i18n/routing";
import { DEFAULT_OG_IMAGE, SITE_NAME, encodedAssetPath } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const plusJakarta = localFont({
  src: "../fonts/plus-jakarta-sans.woff2",
  weight: "400 800",
  display: "swap",
  variable: "--font-sans",
});

const ibmPlexMono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ibm-plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-mono",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E7F1FC" },
    { media: "(prefers-color-scheme: dark)", color: "#070e22" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  applicationName: SITE_NAME,
  icons: {
    icon: encodedAssetPath("/MULTIVATE MAIN LOGO.png"),
    apple: encodedAssetPath("/MULTIVATE MAIN LOGO.png"),
  },
  openGraph: {
    siteName: SITE_NAME,
    images: [{ url: DEFAULT_OG_IMAGE, alt: SITE_NAME }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const headerLocale = headerList.get("x-next-intl-locale") || "";
  const lang = (routing.locales as readonly string[]).includes(headerLocale) ? headerLocale : routing.defaultLocale;

  return (
    <html className={`${plusJakarta.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning lang={lang}>
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
