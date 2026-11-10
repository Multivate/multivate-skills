import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchInternal } from "@/lib/internal-api";
import { privateRobotsMetadata, publicPageMetadata, truncateMeta } from "@/lib/seo";
import { absoluteAssetUrl, absoluteUrl } from "@/lib/site-url";
import { notFound } from "next/navigation";

type PublicProfile = {
  slug: string;
  name: string;
  headline: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
};

async function loadProfile(slug: string): Promise<PublicProfile | null> {
  try {
    const res = await fetchInternal(`/api/v1/profiles/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicProfile;
  } catch {
    return null;
  }
}

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const profile = await loadProfile(slug);
  if (!profile) return privateRobotsMetadata("Profile not found");
  return publicPageMetadata({
    locale,
    path: `/u/${profile.slug}`,
    title: profile.name,
    description: truncateMeta(profile.headline || profile.bio || profile.name),
    image: absoluteAssetUrl(profile.avatar_url),
    type: "profile",
  });
}

export default async function PublicStudentPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const profile = await loadProfile(slug);
  if (!profile) notFound();
  const person: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    url: absoluteUrl(locale, `/u/${profile.slug}`),
  };
  if (profile.headline) person.description = profile.headline;
  const photo = absoluteAssetUrl(profile.avatar_url);
  if (photo) person.image = photo;

  return (
    <>
      <JsonLd data={person} />
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="flex items-start gap-4">
          <UserAvatar name={profile.name} avatarUrl={profile.avatar_url} className="h-16 w-16 text-xl" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#011B33]">{profile.name}</h1>
            {profile.headline ? <p className="mt-1 text-sm text-[#011B33]/60">{profile.headline}</p> : null}
          </div>
        </div>
        {profile.bio ? <p className="mt-8 whitespace-pre-wrap text-sm leading-relaxed text-[#011B33]/80">{profile.bio}</p> : null}
      </main>
      <SiteFooter />
    </>
  );
}
