import { notFound } from "next/navigation";
import { AdminSectionContent } from "@/components/dashboard/AdminSectionContent";

const SECTIONS = new Set([
  "users",
  "courses",
  "instructors",
  "enrollments",
  "payments",
  "certificates",
  "analytics",
  "reviews",
  "system-logs",
]);

const TITLES: Record<string, string> = {
  users: "Users",
  courses: "Courses",
  instructors: "Instructors",
  enrollments: "Enrollments",
  payments: "Payments",
  certificates: "Certificates",
  analytics: "Analytics",
  reviews: "Reviews",
  "system-logs": "System logs",
};

type Props = {
  params: Promise<{ section: string }>;
};

export default async function AdminSectionPage({ params }: Props) {
  const { section } = await params;
  if (!SECTIONS.has(section)) {
    notFound();
  }
  const title = TITLES[section] ?? "Admin";
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-xl font-extrabold tracking-tight text-brand-ink sm:text-2xl">{title}</h1>
      <AdminSectionContent section={section} />
    </div>
  );
}
