import { NotConfiguredNotice } from "@/components/dashboard/NotConfiguredNotice";

export default function DashboardMessagesPage() {
  return (
    <NotConfiguredNotice title="Messages">
      <p>
        There is no messaging service in the Multivate API yet. This screen intentionally shows no threads — add a
        provider (email, chat, or in-app inbox) when you ship messaging.
      </p>
    </NotConfiguredNotice>
  );
}
