import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MentorProfileClient } from "./MentorProfileClient";
import type { PublicMentor } from "@/components/landing/MentorsSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchPublicMentor } from "@/lib/backend-mentors";
import { privateRobotsMetadata, publicPageMetadata, truncateMeta } from "@/lib/seo";
import { absoluteAssetUrl, absoluteUrl } from "@/lib/site-url";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ locale: string; slug: string }> };

type MentorDetail = PublicMentor & {
  languages_spoken?: string;
  career_tips?: string | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const mentor = (await fetchPublicMentor(slug)) as MentorDetail | null;
  if (!mentor) return privateRobotsMetadata("Mentor not found");
  const description = truncateMeta(mentor.headline || mentor.bio || mentor.full_name);
  return publicPageMetadata({
    locale,
    path: `/mentors/${mentor.slug}`,
    title: mentor.full_name,
    description,
    image: absoluteAssetUrl(resolveAvatarUrl(mentor.photo_url)),
    type: "profile",
  });
}

export default async function MentorProfilePage({ params }: Props) {
  const { locale, slug } = await params;
  const mentor = (await fetchPublicMentor(slug)) as MentorDetail | null;
  if (!mentor) notFound();
  const photo = absoluteAssetUrl(resolveAvatarUrl(mentor.photo_url));
  const person: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: mentor.full_name,
    url: absoluteUrl(locale, `/mentors/${mentor.slug}`),
    description: mentor.headline || mentor.bio,
  };
  if (photo) person.image = photo;
  if (mentor.city) person.address = { "@type": "PostalAddress", addressLocality: mentor.city };

  return (
    <>
      <JsonLd data={person} />
      <SiteHeader />
      <main id="main-content" className="bg-brand-surface dark:bg-zinc-950">
        <MentorProfileClient
          mentor={{
            ...mentor,
            languages_spoken: mentor.languages_spoken ?? "",
            career_tips: mentor.career_tips ?? null,
            expertise_areas: mentor.expertise_areas,
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
