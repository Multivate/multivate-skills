"use client";

import { Loader2, Plus, Trash2, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Upload } from "@/components/ui/Upload";
import {
  StudioPanel,
  studioFieldClass,
  studioLabelClass,
} from "@/components/studio/studio-ui";

type Section = { id: string; title: string; position: number };
type Phrase = {
  id: string;
  section_id: string | null;
  position: number;
  source_text: string;
  target_text: string;
  audio_source: string | null;
  audio_url: string | null;
  audio_duration_seconds: number;
};

type CourseDetail = {
  id: string;
  slug: string;
  source_language?: string;
  target_language?: string;
  sections: Section[];
  phrases?: Phrase[];
};

type Props = {
  slug: string;
  course: CourseDetail;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
  loadCourse: (s: string) => Promise<void>;
  showToast: (msg: string) => void;
  onContinueToReview: () => void;
};

function audioPreviewUrl(phrase: Phrase) {
  if (!phrase.audio_url) return null;
  if (phrase.audio_url.startsWith("http") || phrase.audio_url.startsWith("/api/")) {
    return phrase.audio_url;
  }
  return `/api/media/public/${phrase.audio_url}`;
}

export function CourseStudioAudioCurriculum({
  slug,
  course,
  busy,
  setBusy,
  setError,
  loadCourse,
  showToast,
  onContinueToReview,
}: Props) {
  const phrases = useMemo(
    () => [...(course.phrases ?? [])].sort((a, b) => a.position - b.position),
    [course.phrases],
  );
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [audioLink, setAudioLink] = useState("");
  /** Mobile: avoid scrolling past a long list to reach voice upload */
  const [mobilePane, setMobilePane] = useState<"list" | "editor">("list");

  const active = useMemo(
    () => phrases.find((p) => p.id === selectedId) ?? phrases[0] ?? null,
    [phrases, selectedId],
  );

  useEffect(() => {
    if (!active) return;
    setSelectedId(active.id);
    setEditSource(active.source_text);
    setEditTarget(active.target_text);
    setAudioLink(active.audio_source === "url" ? active.audio_url ?? "" : "");
  }, [active?.id]);

  const syncEdit = (p: Phrase) => {
    setSelectedId(p.id);
    setEditSource(p.source_text);
    setEditTarget(p.target_text);
    setAudioLink(p.audio_source === "url" ? p.audio_url ?? "" : "");
    setMobilePane("editor");
  };

  const addSection = async () => {
    if (!newSectionTitle.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/sections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSectionTitle.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't add that section.");
        return;
      }
      setNewSectionTitle("");
      await loadCourse(slug);
      showToast("Section added");
    } finally {
      setBusy(false);
    }
  };

  const addPhrase = async () => {
    if (!sourceText.trim() || !targetText.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/phrases`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: sectionId || null,
          source_text: sourceText.trim(),
          target_text: targetText.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't add that phrase.");
        return;
      }
      setSourceText("");
      setTargetText("");
      await loadCourse(slug);
      const created = data as Phrase;
      syncEdit(created);
      showToast("Phrase added");
    } finally {
      setBusy(false);
    }
  };

  const savePhrase = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/phrases/${active.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_text: editSource.trim(),
          target_text: editTarget.trim(),
          ...(audioLink.trim()
            ? { audio_source: "url", audio_url: audioLink.trim() }
            : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't save that phrase.");
        return;
      }
      await loadCourse(slug);
      showToast("Phrase saved");
    } finally {
      setBusy(false);
    }
  };

  const deletePhrase = async (id: string) => {
    if (!window.confirm("Remove this phrase?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/phrases/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't remove that phrase.");
        return;
      }
      if (selectedId === id) setSelectedId(null);
      await loadCourse(slug);
      showToast("Phrase removed");
    } finally {
      setBusy(false);
    }
  };

  const clearVoice = async () => {
    if (!active) return;
    if (!window.confirm("Remove this voice only? You can upload a new file after.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/phrases/${active.id}/audio`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't remove that voice.");
        return;
      }
      setAudioLink("");
      await loadCourse(slug);
      showToast("Voice removed - upload a new file");
    } finally {
      setBusy(false);
    }
  };

  const grouped = useMemo(() => {
    const sections = [...course.sections].sort((a, b) => a.position - b.position);
    const rows: { key: string; title: string; items: Phrase[] }[] = sections.map((s) => ({
      key: s.id,
      title: s.title,
      items: phrases.filter((p) => p.section_id === s.id),
    }));
    const loose = phrases.filter((p) => !p.section_id);
    if (loose.length || sections.length === 0) {
      rows.unshift({ key: "loose", title: "All phrases", items: loose.length ? loose : phrases.filter((p) => !p.section_id) });
    }
    return rows.filter((r) => r.key === "loose" || r.items.length >= 0);
  }, [course.sections, phrases]);

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm leading-relaxed text-brand-ink/65">
        Add phrases and audio. Students practice them in the classroom. Select a phrase, then upload voice in the editor
        — it stays in view while you work.
      </p>

      <div className="flex rounded-lg border border-brand-ink/10 bg-brand-muted/40 p-1 xl:hidden">
        <button
          type="button"
          onClick={() => setMobilePane("list")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
            mobilePane === "list" ? "bg-white text-brand-ink shadow-sm" : "text-brand-ink/55"
          }`}
        >
          Phrase list
        </button>
        <button
          type="button"
          onClick={() => setMobilePane("editor")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
            mobilePane === "editor" ? "bg-white text-brand-ink shadow-sm" : "text-brand-ink/55"
          }`}
        >
          Voice &amp; edit
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-12 xl:items-start">
        <StudioPanel
          title="Phrase list"
          description={`${course.source_language?.toUpperCase() ?? "EN"} to ${course.target_language?.toUpperCase() ?? "DE"}`}
          className={`xl:col-span-7 ${mobilePane === "editor" ? "hidden xl:block" : ""}`}
        >
          <div className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="Section title (optional grouping)"
                className={`${studioFieldClass} !mt-0 flex-1`}
              />
              <button
                type="button"
                disabled={busy || !newSectionTitle.trim()}
                onClick={() => void addSection()}
                className="inline-flex items-center justify-center gap-1.5 border border-brand-ink bg-brand-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Section
              </button>
            </div>

            <div className="border border-brand-ink/10 bg-brand-muted/30 p-4">
              <p className={studioLabelClass}>Add phrase</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Source text (e.g. I)"
                  className={`${studioFieldClass} !mt-0`}
                />
                <input
                  value={targetText}
                  onChange={(e) => setTargetText(e.target.value)}
                  placeholder="Target text (e.g. ich)"
                  className={`${studioFieldClass} !mt-0`}
                />
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className={`${studioFieldClass} !mt-0 sm:w-48`}
                >
                  <option value="">No section</option>
                  {course.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy || !sourceText.trim() || !targetText.trim()}
                  onClick={() => void addPhrase()}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add phrase
                </button>
              </div>
            </div>

            {phrases.length === 0 ? (
              <div className="border border-dashed border-brand-ink/15 px-6 py-12 text-center">
                <p className="font-display text-xl font-semibold text-brand-ink">No phrases yet</p>
                <p className="mt-2 text-sm text-brand-ink/55">Add your first source and target line above.</p>
              </div>
            ) : (
              <div className="overflow-hidden border border-brand-ink/10">
                {grouped.map((group) => (
                  <div key={group.key}>
                    {course.sections.length > 0 ? (
                      <div className="border-b border-brand-ink/10 bg-brand-muted/50 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-ink/45">
                        {group.title}
                      </div>
                    ) : null}
                    <ul>
                      {group.items.map((p, idx) => {
                        const selected = (selectedId ?? active?.id) === p.id;
                        return (
                          <li
                            key={p.id}
                            onClick={() => syncEdit(p)}
                            className={`grid cursor-pointer grid-cols-[1fr_1fr_auto] items-center gap-3 border-b border-brand-ink/10 px-4 py-3 text-sm last:border-b-0 ${
                              selected ? "bg-brand-muted" : idx % 2 === 1 ? "bg-brand-muted/30" : "bg-white"
                            }`}
                          >
                            <span className="font-medium text-brand-ink">{p.source_text}</span>
                            <span className="font-semibold text-brand-accent">{p.target_text}</span>
                            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-brand-ink/40">
                              {p.audio_url ? "Audio" : "No audio"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </StudioPanel>

        <StudioPanel
          title="Phrase editor"
          description={
            active
              ? `${active.source_text.slice(0, 40)}${active.source_text.length > 40 ? "…" : ""} → voice`
              : "Text and pronunciation audio"
          }
          action={
            active ? (
              <button
                type="button"
                onClick={() => void deletePhrase(active.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            ) : undefined
          }
          className={`xl:col-span-5 xl:sticky xl:top-24 xl:self-start ${
            mobilePane === "list" ? "hidden xl:block" : ""
          }`}
        >
          {active ? (
            <div className="space-y-5">
              <div className="space-y-3 rounded-lg border border-brand-accent/25 bg-brand-accent/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={studioLabelClass}>Voice / audio</span>
                  {active.audio_url ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void clearVoice()}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 transition hover:text-red-900 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Remove voice
                    </button>
                  ) : null}
                </div>

                {audioPreviewUrl(active) ? (
                  <div>
                    <p className="mb-2 text-xs text-brand-ink/50">Current voice</p>
                    <audio
                      key={`${active.id}-${active.audio_url}`}
                      controls
                      preload="metadata"
                      src={audioPreviewUrl(active) ?? undefined}
                      className="w-full"
                    />
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-brand-ink/50">
                    <Volume2 className="h-4 w-4" /> No audio yet — upload below
                  </p>
                )}

                <Upload
                  key={`${active.id}-${active.audio_url ?? "empty"}-${busy ? "busy" : "idle"}`}
                  folder="lessons"
                  subfolder={`${course.id}/${active.id}`}
                  uploadUrl={`/api/studio/phrases/${active.id}/audio`}
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/mp4,audio/aac"
                  label={active.audio_url ? "Drop or click to replace audio" : "Drop or click to upload audio"}
                  hint="MP3, WAV, OGG, or M4A"
                  compact
                  onSuccess={async () => {
                    await loadCourse(slug);
                    showToast(active.audio_url ? "Voice replaced" : "Audio uploaded");
                  }}
                  onError={(msg) => setError(msg)}
                />

                <label className="block">
                  <span className={studioLabelClass}>Or paste audio URL</span>
                  <input
                    value={audioLink}
                    onChange={(e) => setAudioLink(e.target.value)}
                    placeholder="https://…/phrase.mp3"
                    className={studioFieldClass}
                  />
                </label>
              </div>

              <label className="block">
                <span className={studioLabelClass}>Source text</span>
                <input
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  className={studioFieldClass}
                  onFocus={() => {
                    setSelectedId(active.id);
                  }}
                />
              </label>
              <label className="block">
                <span className={studioLabelClass}>Target text</span>
                <input
                  value={editTarget}
                  onChange={(e) => setEditTarget(e.target.value)}
                  className={studioFieldClass}
                />
              </label>

              <button
                type="button"
                disabled={busy}
                onClick={() => void savePhrase()}
                className="w-full border border-brand-ink bg-brand-ink py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save phrase
              </button>
            </div>
          ) : (
            <div className="flex min-h-[240px] items-center justify-center text-center text-sm text-brand-ink/55">
              Select or add a phrase to edit.
            </div>
          )}
        </StudioPanel>
      </div>

      <div className="flex justify-end border-t border-brand-ink/10 pt-6">
        <button type="button" onClick={onContinueToReview} className="btn-cta-accent">
          Continue to review
        </button>
      </div>
    </div>
  );
}
