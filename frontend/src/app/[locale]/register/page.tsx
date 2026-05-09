import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-slate-600">Loading…</div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
