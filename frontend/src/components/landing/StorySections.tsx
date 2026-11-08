import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PhotoCarousel, type StorySlide } from "@/components/landing/PhotoCarousel";
import type { PublicReview } from "@/lib/backend-reviews";

const goals = [
  { title: "goal1Title", body: "goal1Body", image: "/marketing/learners.jpg", icon: "message" },
  { title: "goal2Title", body: "goal2Body", image: "/marketing/class.jpg", icon: "compass" },
  { title: "goal3Title", body: "goal3Body", image: "/marketing/germany.jpg", icon: "trend" },
] as const;

const learnLeft = [
  { title: "learn1Title", body: "learn1Body", image: "/marketing/class.jpg", tall: true },
  { title: "learn3Title", body: "learn3Body", image: "/marketing/germany.jpg", tall: false },
] as const;

const learnRight = [
  { title: "learn2Title", body: "learn2Body", image: "/marketing/study.jpg", tall: false },
  { title: "learn4Title", body: "learn4Body", image: "/marketing/learners.jpg", tall: true },
] as const;

const steps = ["1", "2", "3"] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function StorySections({ reviews }: { reviews: PublicReview[] }) {
  const t = await getTranslations("story");

  return (
    <>
      <section className="border-t border-neutral-200 bg-white py-16 sm:py-20">
        <div className="container-page">
          <h2 className="mx-auto max-w-3xl text-center text-[1.75rem] font-extrabold leading-tight tracking-normal text-[#011B33] sm:text-[2.25rem]">
            {t("partnerTitle")}
          </h2>
          <div className="mt-10">
            <PhotoCarousel
              label={t("partnerTitle")}
              slides={goals.map(
                (goal): StorySlide => ({
                  title: t(goal.title),
                  body: t(goal.body),
                  image: goal.image,
                  icon: goal.icon,
                }),
              )}
            />
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/register"
              className="inline-flex h-[50px] items-center rounded-[5px] bg-brand-accent px-8 text-[16px] font-medium text-white hover:bg-brand-accent-dark"
            >
              {t("cta")}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-brand-sky py-16 sm:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[1.75rem] font-extrabold leading-tight tracking-normal text-[#011B33] sm:text-[2.25rem]">
              {t("learnTitle")}
            </h2>
            <p className="mt-3 text-[17px] leading-7 text-[#011B33]/80">{t("learnSubtitle")}</p>
          </div>
          <div className="mt-10 grid items-start gap-4 md:grid-cols-2 md:gap-6">
            {[learnLeft, learnRight].map((column) => (
              <div key={column[0].title} className="grid gap-4 md:gap-6">
                {column.map((item) => (
                  <article
                    key={item.title}
                    className={
                      item.tall
                        ? "relative h-[28rem] overflow-hidden rounded-2xl md:h-[36rem]"
                        : "relative h-[20rem] overflow-hidden rounded-2xl md:h-[24rem]"
                    }
                  >
                    <img src={item.image} alt={t(item.title)} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/85 via-brand-navy/25 to-transparent" />
                    <div className="relative max-w-md p-6 text-white sm:p-8">
                      <h3 className="text-2xl font-extrabold leading-tight sm:text-3xl">{t(item.title)}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/90 sm:text-base">{t(item.body)}</p>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="container-page">
          <h2 className="mx-auto max-w-3xl text-center text-[1.75rem] font-extrabold leading-tight tracking-normal text-[#011B33] sm:text-[2.25rem]">
            {t("journeyTitle")}
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <li key={step}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy text-lg font-semibold text-white">
                  {step}
                </span>
                <h3 className="mt-4 text-xl font-extrabold text-[#011B33]">{t(`step${step}Title`)}</h3>
                <p className="mt-2 text-sm leading-6 text-[#011B33]/75">{t(`step${step}Body`)}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <Link
              href="/register"
              className="inline-flex h-[50px] items-center rounded-[5px] bg-brand-accent px-8 text-[16px] font-medium text-white hover:bg-brand-accent-dark"
            >
              {t("cta")}
            </Link>
          </div>
        </div>
      </section>

      {reviews.length > 0 ? (
      <section className="bg-white py-16 sm:py-20">
        <div className="container-page">
          <h2 className="max-w-3xl text-[1.75rem] font-extrabold leading-tight text-[#011B33] sm:text-[2.125rem]">
            {t("learnersTitle")}
          </h2>
            <div className="mt-8 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
              {reviews.slice(0, 8).map((review) => (
                <article
                  key={review.id}
                  className="flex h-[34rem] w-[19.5rem] shrink-0 snap-start flex-col rounded-2xl bg-[#f7f9fa] p-6"
                >
                  <span className="font-serif text-5xl leading-none text-neutral-300" aria-hidden>
                    “
                  </span>
                  <p className="mt-6 flex-1 text-[17px] leading-7 text-[#011B33]">{review.comment}</p>
                  <span className="mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white">
                    {initials(review.reviewer_display_name)}
                  </span>
                  <p className="mt-4 text-lg font-bold text-[#011B33]">{review.reviewer_display_name}</p>
                  <p className="mt-1 text-sm text-[#011B33]/70">{review.course_title}</p>
                  <Link
                    href={`/courses/${review.course_slug}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-navy hover:text-brand-accent"
                  >
                    {t("viewCourse")}
                    <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  </Link>
                </article>
              ))}
            </div>
        </div>
      </section>
      ) : null}
    </>
  );
}
