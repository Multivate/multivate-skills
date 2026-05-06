import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ChallengesSection } from "@/components/landing/ChallengesSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { TopCoursesSection } from "@/components/landing/TopCoursesSection";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <ChallengesSection />
        <TopCoursesSection />
        <HowItWorksSection />
        <TestimonialsSection />
      </main>
      <SiteFooter />
    </>
  );
}
