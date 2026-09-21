import { IBM_Plex_Mono, Manrope, Newsreader } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  icons: {
    icon: "/MULTIVATE MAIN LOGO.png",
    apple: "/MULTIVATE MAIN LOGO.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${manrope.variable} ${newsreader.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning lang="en">
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
