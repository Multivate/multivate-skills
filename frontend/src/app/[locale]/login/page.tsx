import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { privateRobotsMetadata } from "@/lib/seo";
import { LoginForm } from "./login-form";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return privateRobotsMetadata(t("loginTitle"), t("loginDescription"));
}

async function LoginFallback() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-muted">
      <p className="text-sm font-medium text-neutral-500">{t("loading")}</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
