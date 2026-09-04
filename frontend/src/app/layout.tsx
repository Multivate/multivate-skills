import { Manrope, Syne } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-display",
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
    <html className={`${manrope.variable} ${syne.variable}`} suppressHydrationWarning lang="en">
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
