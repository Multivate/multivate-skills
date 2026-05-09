import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ChallengesSection } from "@/components/landing/ChallengesSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { TopCoursesSection } from "@/components/landing/TopCoursesSection";
import { TeachOnMultivateSection } from "@/components/landing/TeachOnMultivateSection";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <ChallengesSection />
        <TopCoursesSection />
        <TeachOnMultivateSection />
        <HowItWorksSection />
        <TestimonialsSection />
      </main>
      <SiteFooter />
    </>
  );
}
