import { NotConfiguredNotice } from "@/components/dashboard/NotConfiguredNotice";

export default function DashboardCertificatesPage() {
  return (
    <NotConfiguredNotice title="Certificates">
      <p>
        Certificate generation is not implemented in the backend. Learners will not see placeholder credentials — wire
        PDF issuance or an external credential provider when you are ready.
      </p>
    </NotConfiguredNotice>
  );
}
