import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

async function LoginFallback() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-muted">
      <p className="text-sm font-medium text-slate-600">{t("loading")}</p>
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
