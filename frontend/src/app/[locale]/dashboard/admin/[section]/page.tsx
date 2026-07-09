import { notFound } from "next/navigation";
import { AdminSectionContent } from "@/components/dashboard/AdminSectionContent";

const SECTIONS = new Set([
  "users",
  "student-profiles",
  "instructor-profiles",
  "courses",
  "instructors",
  "data-management",
  "enrollments",
  "payments",
  "discount-codes",
  "mentors",
  "certificates",
  "analytics",
  "reviews",
  "system-logs",
]);

const TITLES: Record<string, string> = {
  users: "Users",
  "student-profiles": "Student learning profiles",
  "instructor-profiles": "Instructor teaching profiles",
  courses: "Courses",
  instructors: "Instructors",
  "data-management": "Data management",
  enrollments: "Enrollments & relationships",
  payments: "Payments",
  "discount-codes": "Discount codes",
  mentors: "Mentor approvals",
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
  const isAnalytics = section === "analytics";
  return (
    <div className={isAnalytics ? "space-y-6" : "mx-auto max-w-6xl space-y-6"}>
      {isAnalytics ? null : (
        <h1 className="text-xl font-extrabold tracking-tight text-brand-ink sm:text-2xl">{title}</h1>
      )}
      <AdminSectionContent section={section} />
    </div>
  );
}
