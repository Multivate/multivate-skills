import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ChallengesSection } from "@/components/landing/ChallengesSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { MentorsSection } from "@/components/landing/MentorsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { TopCoursesSection } from "@/components/landing/TopCoursesSection";
import { TeachOnMultivateSection } from "@/components/landing/TeachOnMultivateSection";
import { fetchBackendCatalog } from "@/lib/backend-courses";
import { fetchPublicMentors } from "@/lib/backend-mentors";
import { fetchBackendPublicReviews } from "@/lib/backend-reviews";

export default async function HomePage() {
  const [courses, reviews, mentors] = await Promise.all([
    fetchBackendCatalog(),
    fetchBackendPublicReviews(),
    fetchPublicMentors(false),
  ]);

  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <ChallengesSection />
        <TopCoursesSection initialCourses={courses} />
        <MentorsSection initialMentors={mentors} />
        <TeachOnMultivateSection />
        <HowItWorksSection />
        <TestimonialsSection initialReviews={reviews} />
      </main>
      <SiteFooter />
    </>
  );
}
