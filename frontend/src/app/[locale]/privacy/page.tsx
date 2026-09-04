import { LegalDocumentLayout, LegalList } from "@/components/legal/LegalDocumentLayout";

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      title="Privacy Policy"
      updated="4 September 2026"
      intro="This Privacy Policy explains what personal information Multivate collects, how we use it, who we share it with, and the choices you have. We collect only what we need to run accounts, deliver learning, process payments, and improve the platform."
      sections={[
        {
          id: "scope",
          title: "Scope",
          body: (
            <>
              <p>
                This Policy applies to Multivate websites, dashboards, mentoring features, payment flows, and related
                services operated by Multivate Technological Services & Consultancy Limited.
              </p>
              <p>It does not cover third-party websites linked from our platform. Those sites have their own policies.</p>
            </>
          ),
        },
        {
          id: "collect",
          title: "Information we collect",
          body: (
            <>
              <p>Depending on how you use Multivate, we may collect:</p>
              <LegalList
                items={[
                  "Account data - name, email address, password (stored hashed), role (student, instructor, mentor, admin), and profile photo.",
                  "Learning data - enrollments, progress, lesson completion, certificates, and questionnaire answers used for recommendations.",
                  "Mentor and instructor data - public profile fields, expertise, messages exchanged through the platform, and approval status.",
                  "Payment data - payment references, amounts, currency, status, and bank-transfer or Remita confirmation details. We do not store full card numbers on Multivate servers when a payment provider handles card entry.",
                  "Technical data - IP address, device/browser type, approximate location derived from IP, and basic usage logs needed for security and reliability.",
                  "Support communications - emails or messages you send to our team.",
                ]}
              />
            </>
          ),
        },
        {
          id: "how-we-use",
          title: "How we use information",
          body: (
            <>
              <p>We use personal information to:</p>
              <LegalList
                items={[
                  "Create and secure your account, including email verification and multi-factor sign-in codes.",
                  "Deliver courses, mentoring, recommendations, and dashboard features.",
                  "Process payments, confirm enrollments, and prevent fraud.",
                  "Send transactional emails (codes, payment status, important account notices).",
                  "Improve product quality, fix bugs, and understand aggregate usage.",
                  "Comply with legal obligations and enforce our Terms of Service.",
                ]}
              />
              <p>
                Marketing emails are only sent where allowed and, where required, with your preference. You can adjust
                device preferences in Settings.
              </p>
            </>
          ),
        },
        {
          id: "kazzy",
          title: "Kazzy and automated guidance",
          body: (
            <>
              <p>
                Kazzy is Multivate’s in-product guide. Chat messages you send to Kazzy may be processed by our systems and
                third-party AI providers we configure to generate a response. Do not submit passwords, payment card numbers,
                or government ID documents in chat.
              </p>
              <p>
                Guidance replies are educational. They are not a substitute for official immigration, legal, or financial
                advice.
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "When we share information",
          body: (
            <>
              <p>We do not sell your personal data. We may share information with:</p>
              <LegalList
                items={[
                  "Service providers who help us operate email delivery (such as Resend), hosting, databases, analytics, or payment processing (such as Remita), under contractual confidentiality obligations.",
                  "Instructors or mentors as needed to deliver the service (for example, an instructor seeing learners enrolled in their course, or a mentor receiving messages you send).",
                  "Professional advisers or authorities when required by law, or to protect rights, safety, and security.",
                  "A successor entity if Multivate is involved in a merger, acquisition, or asset transfer, subject to this Policy or equivalent protection.",
                ]}
              />
            </>
          ),
        },
        {
          id: "retention",
          title: "Retention",
          body: (
            <>
              <p>
                We keep account and learning records for as long as your account is active and as needed to provide the
                service. Payment and security logs may be retained longer where required for accounting, dispute handling,
                or legal compliance. When you request deletion, we will delete or anonymize personal data except where we
                must keep it by law.
              </p>
            </>
          ),
        },
        {
          id: "security",
          title: "Security",
          body: (
            <>
              <p>
                We use technical and organizational measures such as encrypted transport (HTTPS), hashed passwords, access
                controls, and operational monitoring. No online service is perfectly secure. Please use a strong unique
                password and protect codes sent to your email.
              </p>
            </>
          ),
        },
        {
          id: "international",
          title: "International processing",
          body: (
            <>
              <p>
                Multivate may process data in Nigeria and in other countries where our infrastructure or providers operate.
                Where data is transferred internationally, we take steps appropriate to the transfer and the nature of the
                data.
              </p>
            </>
          ),
        },
        {
          id: "rights",
          title: "Your choices and rights",
          body: (
            <>
              <p>Subject to applicable law, you may request to:</p>
              <LegalList
                items={[
                  "Access the personal data we hold about you.",
                  "Correct inaccurate information.",
                  "Delete your account or certain personal data.",
                  "Object to or restrict certain processing.",
                  "Export data you provided, where technically feasible.",
                ]}
              />
              <p>
                To make a request, email{" "}
                <a href="mailto:info@multivate.com.ng" className="font-semibold text-brand-accent hover:text-brand-accent-dark">
                  info@multivate.com.ng
                </a>{" "}
                from the address on your account. We may need to verify your identity before acting.
              </p>
            </>
          ),
        },
        {
          id: "children",
          title: "Children",
          body: (
            <>
              <p>
                Multivate is not directed at children under 16. If you believe we have collected information from a child
                under that age without appropriate consent, contact us and we will take steps to delete it.
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies and similar technologies",
          body: (
            <>
              <p>
                We use essential cookies and similar storage to keep you signed in, remember locale, and protect sessions.
                We may use limited analytics to understand how the site is used. You can control cookies through your
                browser settings; disabling essential cookies may prevent sign-in from working.
              </p>
            </>
          ),
        },
        {
          id: "changes",
          title: "Changes to this Policy",
          body: (
            <>
              <p>
                We may update this Privacy Policy from time to time. The “Last updated” date will change when we do.
                Significant changes will be highlighted on this page or communicated by email when appropriate.
              </p>
            </>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          body: (
            <>
              <p>
                Privacy questions and data requests:{" "}
                <a href="mailto:info@multivate.com.ng" className="font-semibold text-brand-accent hover:text-brand-accent-dark">
                  info@multivate.com.ng
                </a>
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
