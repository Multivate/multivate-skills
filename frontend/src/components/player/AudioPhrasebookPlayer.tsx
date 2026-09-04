"use client";

import { Link } from "@/i18n/navigation";
import { ArrowLeft, BookmarkPlus, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Phrase = {
  id: string;
  section_id: string | null;
  position: number;
  source_text: string;
  target_text: string;
  audio_url: string | null;
  audio_duration_seconds: number;
};

type Section = { id: string; title: string; position: number };

type Phrasebook = {
  course_slug: string;
  course_title: string;
  image_url: string;
  format: string;
  source_language: string;
  target_language: string;
  progress_pct: number;
  sections: Section[];
  phrases: Phrase[];
};

type Props = { slug: string; preview?: boolean };

export function AudioPhrasebookPlayer({ slug, preview = false }: Props) {
  const [data, setData] = useState<Phrasebook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const qs = preview ? "?preview=true" : "";

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/player/${encodeURIComponent(slug)}/phrasebook${qs}`, {
      credentials: "include",
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(typeof body?.detail === "string" ? body.detail : "We couldn't open this phrasebook.");
      return;
    }
    setData(body as Phrasebook);
  }, [slug, qs]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const grouped = useMemo(() => {
    if (!data) return [];
    const sections = [...data.sections].sort((a, b) => a.position - b.position);
    const phrases = [...data.phrases].sort((a, b) => a.position - b.position);
    if (sections.length === 0) {
      return [{ key: "all", title: null as string | null, items: phrases }];
    }
    const rows = sections.map((s) => ({
      key: s.id,
      title: s.title as string | null,
      items: phrases.filter((p) => p.section_id === s.id),
    }));
    const loose = phrases.filter((p) => !p.section_id);
    if (loose.length) rows.unshift({ key: "loose", title: null, items: loose });
    return rows;
  }, [data]);

  const playPhrase = (phrase: Phrase) => {
    if (!phrase.audio_url) return;
    if (playingId === phrase.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("ended", () => setPlayingId(null));
    }
    audioRef.current.src = phrase.audio_url;
    void audioRef.current.play();
    setPlayingId(phrase.id);
  };

  if (error) {
    return (
      <div className="mx-auto max-w-lg border border-brand-ink/10 bg-white px-6 py-10 text-center">
        <p className="text-sm text-brand-ink/70">{error}</p>
        <Link href={preview ? `/dashboard/instructor/studio/${slug}` : "/dashboard/courses"} className="mt-6 inline-block text-sm font-semibold text-brand-accent">
          Go back
        </Link>
      </div>
    );
  }

  if (!data) {
    return <p className="py-16 text-center text-sm text-brand-ink/50">Opening phrasebook…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-ink/10 pb-6">
        <div>
          <Link
            href={preview ? `/dashboard/instructor/studio/${slug}` : "/dashboard/courses"}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {preview ? "Studio" : "My courses"}
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-brand-ink">{data.course_title}</h1>
          <p className="mt-2 text-sm text-brand-ink/55">
            {data.source_language.toUpperCase()} to {data.target_language.toUpperCase()} · {data.phrases.length} phrases
          </p>
        </div>
      </div>

      <div className="overflow-hidden border border-brand-ink/10 bg-white">
        {grouped.map((group) => (
          <div key={group.key}>
            {group.title ? (
              <div className="border-b border-brand-ink/10 bg-brand-ink px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                {group.title}
              </div>
            ) : null}
            <ul>
              {group.items.map((phrase, idx) => {
                const isPlaying = playingId === phrase.id;
                const isSaved = saved.has(phrase.id);
                return (
                  <li
                    key={phrase.id}
                    className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3 border-b border-brand-ink/10 px-4 py-3.5 last:border-b-0 ${
                      idx % 2 === 1 ? "bg-[#f3f0f8]" : "bg-white"
                    }`}
                  >
                    <p className="text-sm text-brand-ink">{phrase.source_text}</p>
                    <p className="text-sm font-semibold text-[#2f5fb3]">{phrase.target_text}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!phrase.audio_url}
                        onClick={() => playPhrase(phrase)}
                        className="inline-flex h-9 w-9 items-center justify-center border border-brand-ink/15 bg-[#ececee] text-brand-ink transition hover:bg-brand-muted disabled:opacity-40"
                        aria-label={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSaved((prev) => {
                            const next = new Set(prev);
                            if (next.has(phrase.id)) next.delete(phrase.id);
                            else next.add(phrase.id);
                            return next;
                          })
                        }
                        className={`inline-flex h-9 w-9 items-center justify-center border border-brand-ink/15 bg-[#ececee] transition ${
                          isSaved ? "text-brand-accent" : "text-brand-ink/50 hover:text-brand-ink"
                        }`}
                        aria-label="Save phrase"
                      >
                        <BookmarkPlus className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {data.phrases.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-brand-ink/55">No phrases in this course yet.</p>
        ) : null}
      </div>
    </div>
  );
}
