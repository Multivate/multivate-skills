"use client";

import { Loader2, Plus, Trash2, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Upload } from "@/components/ui/Upload";
import {
  StudioPanel,
  studioFieldClass,
  studioLabelClass,
} from "@/components/studio/studio-ui";
import {
  nextWeekTitle,
  readDoneWeekIds,
  readStoredWeekId,
  writeDoneWeekIds,
  writeStoredWeekId,
} from "@/lib/studio-weeks";

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
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [audioLink, setAudioLink] = useState("");
  const [mobilePane, setMobilePane] = useState<"list" | "editor">("list");
  const [currentWeekId, setCurrentWeekId] = useState<string | null>(null);
  const [doneWeekIds, setDoneWeekIds] = useState<string[]>([]);

  const weeks = useMemo(
    () => [...course.sections].sort((a, b) => a.position - b.position),
    [course.sections],
  );
  const currentWeek = weeks.find((w) => w.id === currentWeekId) ?? weeks[0] ?? null;
  const weekPhrases = useMemo(
    () =>
      currentWeek
        ? phrases.filter((p) => p.section_id === currentWeek.id)
        : phrases.filter((p) => !p.section_id),
    [phrases, currentWeek],
  );

  const active = useMemo(
    () => weekPhrases.find((p) => p.id === selectedId) ?? weekPhrases[0] ?? null,
    [weekPhrases, selectedId],
  );

  useEffect(() => {
    setDoneWeekIds(readDoneWeekIds(slug));
    const stored = readStoredWeekId(slug);
    if (stored && weeks.some((w) => w.id === stored)) {
      setCurrentWeekId(stored);
      return;
    }
    const done = new Set(readDoneWeekIds(slug));
    const open = weeks.find((w) => !done.has(w.id)) ?? weeks[weeks.length - 1] ?? null;
    setCurrentWeekId(open?.id ?? null);
  }, [slug, weeks]);

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

  const selectWeek = (id: string) => {
    setCurrentWeekId(id);
    writeStoredWeekId(slug, id);
    setSelectedId(null);
  };

  const addWeek = async () => {
    const title = nextWeekTitle(weeks.map((w) => w.title));
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/sections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "Could not add that week.");
        return;
      }
      const created = data as Section;
      if (created?.id) {
        selectWeek(created.id);
      }
      await loadCourse(slug);
      showToast(`${title} is ready`);
    } finally {
      setBusy(false);
    }
  };

  const markWeekReady = () => {
    if (!currentWeek) return;
    const nextDone = Array.from(new Set([...doneWeekIds, currentWeek.id]));
    setDoneWeekIds(nextDone);
    writeDoneWeekIds(slug, nextDone);
    const remaining = weeks.filter((w) => !nextDone.includes(w.id) && w.id !== currentWeek.id);
    if (remaining[0]) {
      selectWeek(remaining[0].id);
      showToast(`${currentWeek.title} is put away`);
      return;
    }
    void addWeek();
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
          section_id: currentWeek?.id ?? null,
          source_text: sourceText.trim(),
          target_text: targetText.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "Could not add that phrase.");
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
        setError(typeof data?.detail === "string" ? data.detail : "Could not save that phrase.");
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
        setError(typeof data?.detail === "string" ? data.detail : "Could not remove that phrase.");
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

  const weekReady = weekPhrases.length > 0 && weekPhrases.every((p) => Boolean(p.audio_url));
  const hiddenWeeks = weeks.filter((w) => doneWeekIds.includes(w.id) && w.id !== currentWeek?.id);

  return (
    <div className="space-y-5">
      <div className="flex rounded-sm border border-brand-ink/10 bg-brand-muted/40 p-1 xl:hidden">
        <button
          type="button"
          onClick={() => setMobilePane("list")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
            mobilePane === "list" ? "bg-brand-surface text-brand-ink" : "text-brand-ink/55"
          }`}
        >
          This week
        </button>
        <button
          type="button"
          onClick={() => setMobilePane("editor")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
            mobilePane === "editor" ? "bg-brand-surface text-brand-ink" : "text-brand-ink/55"
          }`}
        >
          Voice
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-12 xl:items-start">
        <StudioPanel
          title={currentWeek ? currentWeek.title : "Start with Week 1"}
          description={`${course.source_language?.toUpperCase() ?? "EN"} to ${course.target_language?.toUpperCase() ?? "DE"}`}
          action={
            <button
              type="button"
              disabled={busy}
              onClick={() => void addWeek()}
              className="text-xs font-semibold text-brand-ink/70"
            >
              New week
            </button>
          }
          className={`xl:col-span-7 ${mobilePane === "editor" ? "hidden xl:block" : ""}`}
        >
          <div className="space-y-4">
            {hiddenWeeks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {hiddenWeeks.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => selectWeek(w.id)}
                    className="rounded-full border border-brand-ink/10 bg-brand-muted/50 px-3 py-1 text-xs font-medium text-brand-ink/55"
                  >
                    {w.title} (done)
                  </button>
                ))}
              </div>
            ) : null}

            {!currentWeek ? (
              <div className="border border-dashed border-brand-ink/15 px-6 py-10 text-center">
                <p className="font-display text-lg font-semibold text-brand-ink">No week yet</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void addWeek()}
                  className="btn-cta-accent mt-4 inline-flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add Week 1
                </button>
              </div>
            ) : (
              <>
                <div className="border border-brand-ink/10 bg-brand-muted/30 p-4">
                  <p className={studioLabelClass}>Add to {currentWeek.title}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      placeholder="English"
                      className={`${studioFieldClass} !mt-0`}
                    />
                    <input
                      value={targetText}
                      onChange={(e) => setTargetText(e.target.value)}
                      placeholder="German"
                      className={`${studioFieldClass} !mt-0`}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy || !sourceText.trim() || !targetText.trim()}
                    onClick={() => void addPhrase()}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 bg-brand-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add phrase
                  </button>
                </div>

                {weekPhrases.length === 0 ? (
                  <p className="py-6 text-center text-sm text-brand-ink/50">Add the lines for this week, then upload voice.</p>
                ) : (
                  <ul className="overflow-hidden border border-brand-ink/10">
                    {weekPhrases.map((p, idx) => {
                      const selected = (selectedId ?? active?.id) === p.id;
                      return (
                        <li
                          key={p.id}
                          onClick={() => syncEdit(p)}
                          className={`grid cursor-pointer grid-cols-[1fr_1fr_auto] items-center gap-3 border-b border-brand-ink/10 px-4 py-3 text-sm last:border-b-0 ${
                            selected ? "bg-brand-muted" : idx % 2 === 1 ? "bg-brand-muted/30" : "bg-brand-surface"
                          }`}
                        >
                          <span className="font-medium text-brand-ink">{p.source_text}</span>
                          <span className="font-medium text-brand-ink/80">{p.target_text}</span>
                          <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-brand-ink/40">
                            {p.audio_url ? "Voice" : "Needs voice"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {weekReady ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => markWeekReady()}
                    className="w-full border border-brand-ink bg-brand-surface py-2.5 text-sm font-semibold text-brand-ink"
                  >
                    This week is ready. Hide it and open the next.
                  </button>
                ) : null}
              </>
            )}
          </div>
        </StudioPanel>

        <StudioPanel
          title="Voice"
          description={active ? active.source_text : "Pick a phrase"}
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
              <div className="space-y-3 border border-brand-ink/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={studioLabelClass}>Audio file</span>
                  {active.audio_url ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void clearVoice()}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Remove voice
                    </button>
                  ) : null}
                </div>

                {audioPreviewUrl(active) ? (
                  <audio
                    key={`${active.id}-${active.audio_url}`}
                    controls
                    preload="metadata"
                    src={audioPreviewUrl(active) ?? undefined}
                    className="w-full"
                  />
                ) : (
                  <p className="flex items-center gap-2 text-sm text-brand-ink/50">
                    <Volume2 className="h-4 w-4" /> No file yet
                  </p>
                )}

                <Upload
                  key={`${active.id}-${active.audio_url ?? "empty"}-${busy ? "busy" : "idle"}`}
                  folder="lessons"
                  subfolder={`${course.id}/${active.id}`}
                  uploadUrl={`/api/studio/phrases/${active.id}/audio`}
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/mp4,audio/aac"
                  label={active.audio_url ? "Replace audio" : "Upload audio"}
                  hint="MP3, WAV, OGG, or M4A"
                  compact
                  onSuccess={async () => {
                    await loadCourse(slug);
                    showToast(active.audio_url ? "Voice replaced" : "Audio uploaded");
                  }}
                  onError={(msg) => setError(msg)}
                />

                <label className="block">
                  <span className={studioLabelClass}>Or paste an audio link</span>
                  <input
                    value={audioLink}
                    onChange={(e) => setAudioLink(e.target.value)}
                    placeholder="https://example.com/phrase.mp3"
                    className={studioFieldClass}
                  />
                </label>
              </div>

              <label className="block">
                <span className={studioLabelClass}>English</span>
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
                <span className={studioLabelClass}>German</span>
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
            <div className="flex min-h-[200px] items-center justify-center text-center text-sm text-brand-ink/55">
              Add a phrase for this week to upload voice.
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
