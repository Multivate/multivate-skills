export type StudyMode = "online" | "hybrid" | "physical";

export type StudentPortalCourse = {
  slug: string;
  title: string;
  progress_pct: number;
  status: string;
};

export type StudentPortalPayment = {
  status: string;
  amount_cents: number;
  currency: string;
  course_title: string | null;
  payment_reference: string | null;
};

export type StudentPortalRecord = {
  student_code: string;
  name: string;
  email: string;
  study_mode: StudyMode | string;
  campus_location: string | null;
  cohort_name: string | null;
  goal_code: string;
  topic: string;
  german_level: string;
  weekly_hours: string;
  enrolled_count: number;
  outstanding_payments: number;
  courses: StudentPortalCourse[];
  payments: StudentPortalPayment[];
  visits_this_week: number;
  visit_goal: number;
  minutes_this_week: number;
  minutes_goal: number;
  visited_today?: boolean;
};

export const DEFAULT_CAMPUS = "Ibadan, Oyo state";

export function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const MODES: StudyMode[] = ["online", "hybrid", "physical"];

export function asStudyMode(raw: string | null | undefined): StudyMode {
  return MODES.includes(raw as StudyMode) ? (raw as StudyMode) : "online";
}

export function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : undefined, {
    style: "currency",
    currency,
  }).format(cents / 100);
}
