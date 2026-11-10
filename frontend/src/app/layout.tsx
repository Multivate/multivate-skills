import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { THEME_BOOT_SCRIPT } from "@/lib/appearance";
import { routing } from "@/i18n/routing";
import { DEFAULT_OG_IMAGE, SITE_NAME, encodedAssetPath } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
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
