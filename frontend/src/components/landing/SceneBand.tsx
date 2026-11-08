import Image from "next/image";
import { getTranslations } from "next-intl/server";

const scenes = [
  { src: "/marketing/class.jpg", titleKey: "step3Title", bodyKey: "step3Body", delay: "" },
  { src: "/marketing/study.jpg", titleKey: "step2Title", bodyKey: "step2Body", delay: "delay-100" },
  { src: "/marketing/germany.jpg", titleKey: "step4Title", bodyKey: "step4Body", delay: "delay-200" },
] as const;

export async function SceneBand() {
  const t = await getTranslations("howItWorks");

  return (
    <section className="bg-white pb-4 pt-14 sm:pt-16">
      <div className="container-page grid gap-4 sm:grid-cols-3">
        {scenes.map((scene) => (
          <article
            key={scene.src}
            className={`group relative min-h-[18rem] overflow-hidden rounded-[1.5rem] bg-brand-navy sm:min-h-[22rem] ${scene.delay}`}
          >
            <Image
              src={scene.src}
              alt=""
              fill
              className="object-cover transition duration-700 group-hover:scale-105"
              sizes="(min-width: 640px) 33vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
              <h2 className="text-xl font-semibold">{t(scene.titleKey)}</h2>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-white/80">{t(scene.bodyKey)}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
