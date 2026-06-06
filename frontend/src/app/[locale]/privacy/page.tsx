import { Link } from "@/i18n/navigation";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold text-brand-ink">Privacy policy</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        We collect only what we need to run your account, deliver courses, and process payments. That includes your name,
        email, learning progress, and payment references. We do not sell your personal data.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        You can ask us to update or delete your account details by writing to{" "}
        <a href="mailto:info@multivate.com.ng" className="font-semibold text-brand-primary hover:underline">
          info@multivate.com.ng
        </a>
        .
      </p>
      <Link href="/" className="mt-8 inline-flex text-sm font-bold text-brand-primary hover:underline">
        Back to home
      </Link>
    </main>
  );
}
