import { LegalDocumentLayout, LegalList } from "@/components/legal/LegalDocumentLayout";

export default function TermsPage() {
  return (
    <LegalDocumentLayout
      title="Terms of Service"
      updated="4 September 2026"
      intro="These Terms of Service govern your use of Multivate, including our website, courses, mentoring features, payments, and related services. By creating an account, browsing as a signed-in user, or purchasing access, you agree to these Terms."
      sections={[
        {
          id: "who-we-are",
          title: "Who we are",
          body: (
            <>
              <p>
                Multivate (Multivate Technological Services & Consultancy Limited) operates an online learning platform that
                helps learners build technology and German-language skills for study, work, and career goals connected to
                Germany and related pathways.
              </p>
              <p>
                Contact:{" "}
                <a href="mailto:info@multivate.com.ng" className="font-semibold text-brand-accent hover:text-brand-accent-dark">
                  info@multivate.com.ng
                </a>
              </p>
            </>
          ),
        },
        {
          id: "eligibility",
          title: "Eligibility and accounts",
          body: (
            <>
              <p>To use Multivate you must:</p>
              <LegalList
                items={[
                  "Be at least 16 years old, or the minimum age required in your country for online services.",
                  "Provide accurate registration details and keep them up to date.",
                  "Keep your password and verification codes confidential.",
                  "Use only one account unless we expressly allow otherwise.",
                ]}
              />
              <p>
                You are responsible for activity under your account. Tell us promptly if you believe your account has been
                accessed without permission.
              </p>
            </>
          ),
        },
        {
          id: "roles",
          title: "Roles on the platform",
          body: (
            <>
              <p>Multivate supports different account types:</p>
              <LegalList
                items={[
                  "Students - enroll in courses, track progress, pay for paid programs, and message mentors where available.",
                  "Instructors - create and manage course content through Course Studio subject to our review and publishing rules.",
                  "Mentors - publish a public mentor profile after approval and respond to visitor or learner messages.",
                  "Admins - operate platform administration tools on behalf of Multivate.",
                ]}
              />
              <p>
                Mentors and instructors act as independent content or guidance providers unless we state otherwise in a
                separate written agreement. Multivate may approve, reject, feature, or remove mentor and course content that
                does not meet our standards.
              </p>
            </>
          ),
        },
        {
          id: "courses-access",
          title: "Courses, access, and certificates",
          body: (
            <>
              <p>
                Course descriptions, pricing, lesson counts, and outcomes are provided for information. We aim for accuracy
                but may correct errors and update materials as programs evolve.
              </p>
              <LegalList
                items={[
                  "Enrollment grants a personal, non-transferable license to access the course for your own learning.",
                  "You may not copy, redistribute, resell, or publicly share paid course videos or downloads without permission.",
                  "Certificates, where offered, confirm completion of Multivate program requirements and are not a government or university credential unless expressly stated.",
                  "We may suspend access for chargebacks, fraud, abuse, or serious Terms violations.",
                ]}
              />
            </>
          ),
        },
        {
          id: "payments",
          title: "Payments, pricing, and refunds",
          body: (
            <>
              <p>
                Paid enrollments may be processed through bank transfer instructions, Remita, or other payment methods we
                enable. Prices are shown in the currency indicated at checkout.
              </p>
              <LegalList
                items={[
                  "You authorize us to collect payment for the selected course or service.",
                  "Access to paid content may remain pending until payment is confirmed or approved.",
                  "Taxes or bank fees charged by your provider are your responsibility unless we say otherwise.",
                  "Refund requests are reviewed case by case. Contact info@multivate.com.ng with your payment reference and reason.",
                ]}
              />
              <p>
                Discount codes, if issued, may be limited by time, course, or account and can be withdrawn if misused.
              </p>
            </>
          ),
        },
        {
          id: "conduct",
          title: "Acceptable use",
          body: (
            <>
              <p>You agree not to:</p>
              <LegalList
                items={[
                  "Harass, threaten, or abuse other users, mentors, instructors, or staff.",
                  "Upload malware, scrape the platform at scale, or attempt unauthorized access.",
                  "Post unlawful, discriminatory, or misleading content.",
                  "Impersonate another person or misrepresent your credentials.",
                  "Use Multivate to send spam or unsolicited commercial messages.",
                ]}
              />
              <p>We may remove content, limit features, or close accounts that break these rules.</p>
            </>
          ),
        },
        {
          id: "guidance",
          title: "Guidance tools and mentors",
          body: (
            <>
              <p>
                Features such as Kazzy (our Multivate guide) and mentor messaging provide general educational and career
                information. They are not legal, immigration, visa, medical, or financial advice. Always verify official
                requirements with the relevant authority before making decisions.
              </p>
              <p>
                Mentors share personal experience. Multivate does not guarantee outcomes such as admission, employment, or
                visa approval.
              </p>
            </>
          ),
        },
        {
          id: "ip",
          title: "Intellectual property",
          body: (
            <>
              <p>
                Multivate branding, software, and platform design are owned by Multivate or our licensors. Course content
                remains owned by Multivate or the instructor who created it, as applicable. Your feedback may be used to
                improve the service without obligation to you.
              </p>
            </>
          ),
        },
        {
          id: "availability",
          title: "Service changes and availability",
          body: (
            <>
              <p>
                We work to keep Multivate available, but we do not guarantee uninterrupted access. We may modify, pause, or
                discontinue features with reasonable notice when practical. Scheduled maintenance or outages may occur.
              </p>
            </>
          ),
        },
        {
          id: "liability",
          title: "Disclaimer and limitation of liability",
          body: (
            <>
              <p>
                The platform is provided on an “as is” and “as available” basis to the fullest extent permitted by law. To
                the extent allowed, Multivate is not liable for indirect, incidental, or consequential damages, or for loss
                of data, profits, or opportunity arising from your use of the service.
              </p>
              <p>
                Nothing in these Terms excludes liability that cannot be excluded under applicable law.
              </p>
            </>
          ),
        },
        {
          id: "termination",
          title: "Suspension and termination",
          body: (
            <>
              <p>
                You may stop using Multivate at any time. We may suspend or terminate access if you breach these Terms,
                create risk for other users, or if we are required to do so by law. Provisions that should survive
                termination (such as intellectual property and limitation of liability) will remain in effect.
              </p>
            </>
          ),
        },
        {
          id: "changes",
          title: "Changes to these Terms",
          body: (
            <>
              <p>
                We may update these Terms as Multivate grows. The “Last updated” date at the top will change when we do.
                Continued use after updates means you accept the revised Terms. If a change is material, we will try to
                provide additional notice where reasonable.
              </p>
            </>
          ),
        },
        {
          id: "governing-law",
          title: "Governing law",
          body: (
            <>
              <p>
                These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to conflict-of-law
                rules, unless mandatory consumer protections in your country require otherwise.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
