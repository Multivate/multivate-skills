import { Link } from "@/i18n/navigation";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold text-brand-ink">Terms of service</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        These terms explain how you may use Multivate. By creating an account or enrolling in a course, you agree to follow
        them. We may update this page as the platform grows; continued use means you accept the latest version.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        For questions about billing, course access, or your account, contact us at{" "}
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
