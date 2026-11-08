import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { privateRobotsMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return privateRobotsMetadata(t("forgotTitle"), t("forgotDescription"));
}

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
