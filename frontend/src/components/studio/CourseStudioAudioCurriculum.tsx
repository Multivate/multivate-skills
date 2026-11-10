"use client";

import { ChevronDown, ChevronUp, Loader2, Plus, Trash2, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Upload } from "@/components/ui/Upload";
import { StudioPanel, studioFieldClass, studioLabelClass } from "@/components/studio/studio-ui";
import { CLASSROOM_SCENES } from "@/lib/classroom-prefs";
import { nextModuleTitle, readStoredWeekId, writeStoredWeekId } from "@/lib/studio-weeks";

type Section = { id: string; title: string; position: number; scene_key?: string | null };
type Phrase = {
  id: string;
  section_id: string | null;
  position: number;
  source_text: string;
  target_text: string;
  usage_note?: string | null;
  ipa?: string | null;
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
  const [bulkText, setBulkText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editUsage, setEditUsage] = useState("");
  const [editIpa, setEditIpa] = useState("");
  const [audioLink, setAudioLink] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [mobilePane, setMobilePane] = useState<"list" | "editor">("list");
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);

  const modules = useMemo(
    () => [...course.sections].sort((a, b) => a.position - b.position),
    [course.sections],
  );
  const currentModule = modules.find((row) => row.id === currentModuleId) ?? modules[0] ?? null;
  const moduleLessons = useMemo(
    () =>
      currentModule
        ? phrases.filter((row) => row.section_id === currentModule.id)
        : phrases.filter((row) => !row.section_id),
    [phrases, currentModule],
  );
  const active = useMemo(
    () => moduleLessons.find((row) => row.id === selectedId) ?? moduleLessons[0] ?? null,
    [moduleLessons, selectedId],
  );

  useEffect(() => {
    const stored = readStoredWeekId(slug);
    if (stored && modules.some((row) => row.id === stored)) {
      setCurrentModuleId(stored);
      return;
    }
    setCurrentModuleId(modules[0]?.id ?? null);
  }, [slug, modules]);

  useEffect(() => {
    setModuleTitle(currentModule?.title ?? "");
  }, [currentModule?.id, currentModule?.title]);

  useEffect(() => {
    if (!active) return;
    setSelectedId(active.id);
    setEditSource(active.source_text);
    setEditTarget(active.target_text);
    setEditUsage(active.usage_note ?? "");
    setEditIpa(active.ipa ?? "");
    setAudioLink(active.audio_source === "url" ? active.audio_url ?? "" : "");
  }, [active?.id]);

  const syncEdit = (row: Phrase) => {
    setSelectedId(row.id);
    setEditSource(row.source_text);
    setEditTarget(row.target_text);
    setEditUsage(row.usage_note ?? "");
    setEditIpa(row.ipa ?? "");
    setAudioLink(row.audio_source === "url" ? row.audio_url ?? "" : "");
    setMobilePane("editor");
  };

  const selectModule = (id: string) => {
    setCurrentModuleId(id);
    writeStoredWeekId(slug, id);
    setSelectedId(null);
  };

  const addModule = async () => {
    const title = nextModuleTitle(modules.map((row) => row.title));
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/sections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, scene_key: "cafe" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "Could not add that module.");
        return;
      }
      const created = data as Section;
      if (created?.id) selectModule(created.id);
      await loadCourse(slug);
      showToast(`${title} is ready`);
    } finally {
      setBusy(false);
    }
  };

  const saveModule = async () => {
    if (!currentModule || !moduleTitle.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/sections/${currentModule.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: moduleTitle.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "Could not rename that module.");
        return;
      }
      await loadCourse(slug);
      showToast("Module saved");
    } finally {
      setBusy(false);
    }
  };

  const setScene = async (scene_key: string) => {
    if (!currentModule) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/sections/${currentModule.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene_key }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "Could not save that scene.");
        return;
      }
      await loadCourse(slug);
    } finally {
      setBusy(false);
    }
  };

  const deleteModule = async () => {
    if (!currentModule) return;
    if (!window.confirm(`Delete module "${currentModule.title}" and its lessons?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/sections/${currentModule.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "Could not delete that module.");
        return;
      }
      setCurrentModuleId(null);
      await loadCourse(slug);
      showToast("Module removed");
    } finally {
      setBusy(false);
    }
  };

  const addLesson = async () => {
    const lines = sourceText
      .split(/\n|,/)
      .map((row) => row.trim())
      .filter(Boolean);
    const extra = bulkText
      .split(/\n/)
      .map((row) => row.trim())
      .filter(Boolean);
    const all = [...lines, ...extra];
    if (!all.length) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/phrases/from-english`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: currentModule?.id ?? null,
          lines: all,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "Could not generate those lessons.");
        return;
      }
      setSourceText("");
      setBulkText("");
      await loadCourse(slug);
      const created = Array.isArray(data) ? (data[data.length - 1] as Phrase) : null;
      if (created) syncEdit(created);
      showToast(all.length === 1 ? "Lesson generated" : `${all.length} lessons generated`);
    } finally {
      setBusy(false);
    }
  };

  const saveLesson = async () => {
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
          usage_note: editUsage.trim(),
          ipa: editIpa.trim(),
          ...(audioLink.trim() ? { audio_source: "url", audio_url: audioLink.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "Could not save that lesson.");
        return;
      }
      await loadCourse(slug);
      showToast("Lesson saved");
    } finally {
      setBusy(false);
    }
  };

  const deleteLesson = async (id: string) => {
    if (!window.confirm("Remove this lesson?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/phrases/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "Could not remove that lesson.");
        return;
      }
      if (selectedId === id) setSelectedId(null);
      await loadCourse(slug);
      showToast("Lesson removed");
    } finally {
      setBusy(false);
    }
  };

  const moveLesson = async (id: string, dir: -1 | 1) => {
    const ids = moduleLessons.map((row) => row.id);
    const index = ids.indexOf(id);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= ids.length) return;
    const swapped = [...ids];
    const hold = swapped[index];
    swapped[index] = swapped[next];
    swapped[next] = hold;
    const all = phrases.map((row) => row.id);
    const rebuilt = all.filter((row) => !ids.includes(row));
    const insertAt = all.findIndex((row) => ids.includes(row));
    rebuilt.splice(insertAt < 0 ? rebuilt.length : insertAt, 0, ...swapped);
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/phrases/reorder`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase_ids: rebuilt }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "Could not reorder lessons.");
        return;
      }
      await loadCourse(slug);
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
      const res = await fetch(`/api/studio/phrases/${active.id}/audio`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't remove that voice.");
        return;
      }
      setAudioLink("");
      await loadCourse(slug);
      showToast("Voice removed");
    } finally {
      setBusy(false);
    }
  };

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
          Module
        </button>
        <button
          type="button"
          onClick={() => setMobilePane("editor")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
            mobilePane === "editor" ? "bg-brand-surface text-brand-ink" : "text-brand-ink/55"
          }`}
        >
          Lesson
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {modules.map((row, index) => (
          <button
            key={row.id}
            type="button"
            onClick={() => selectModule(row.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              currentModule?.id === row.id ? "bg-[#1457D0] text-white" : "border border-brand-ink/10 text-brand-ink/70"
            }`}
          >
            Module {index + 1}: {row.title}
          </button>
        ))}
        <button type="button" disabled={busy} onClick={() => void addModule()} className="inline-flex items-center gap-1 text-xs font-semibold text-[#1457D0]">
          <Plus className="h-3.5 w-3.5" /> Add module
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-12 xl:items-start">
        <StudioPanel
          title={currentModule ? currentModule.title : "Start with Module 1"}
          description="Name the module, add English words or lines. German, scene, usage, spelling, assessment, and voice are generated."
          action={
            currentModule ? (
              <button type="button" onClick={() => void deleteModule()} className="text-xs font-semibold text-red-700">
                Delete module
              </button>
            ) : undefined
          }
          className={`xl:col-span-7 ${mobilePane === "editor" ? "hidden xl:block" : ""}`}
        >
          <div className="space-y-4">
            {!currentModule ? (
              <div className="border border-dashed border-brand-ink/15 px-6 py-10 text-center">
                <p className="font-display text-lg font-semibold text-brand-ink">No module yet</p>
                <button type="button" disabled={busy} onClick={() => void addModule()} className="btn-cta-accent mt-4 inline-flex items-center gap-1.5">
                  <Plus className="h-4 w-4" /> Add Module 1
                </button>
              </div>
            ) : (
              <>
                <label className="block">
                  <span className={studioLabelClass}>Module name</span>
                  <div className="mt-1 flex gap-2">
                    <input value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} className={`${studioFieldClass} !mt-0`} />
                    <button type="button" disabled={busy} onClick={() => void saveModule()} className="shrink-0 rounded-[5px] bg-brand-ink px-3 text-sm font-semibold text-white disabled:opacity-50">
                      Save
                    </button>
                  </div>
                </label>

                <div>
                  <p className={studioLabelClass}>Real-life scene</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {CLASSROOM_SCENES.map((scene) => {
                      const on = (currentModule.scene_key || "cafe") === scene.id;
                      return (
                        <button
                          key={scene.id}
                          type="button"
                          disabled={busy}
                          onClick={() => void setScene(scene.id)}
                          className={`overflow-hidden rounded-[10px] border text-left ${on ? "border-[#1457D0] ring-2 ring-[#1457D0]/30" : "border-brand-ink/10"}`}
                        >
                          <img src={scene.src} alt="" className="h-16 w-full object-cover" />
                          <span className="block px-2 py-1 text-[11px] font-semibold">{scene.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border border-brand-ink/10 bg-brand-muted/30 p-4">
                  <p className={studioLabelClass}>Add English. German, usage, scene, and classroom voice fill in automatically.</p>
                  <input
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Hello"
                    className={`${studioFieldClass} mt-3`}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void addLesson();
                      }
                    }}
                  />
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={3}
                    placeholder={"Or paste one English word or line per row:\nThank you\nPlease\nWhere is the station?"}
                    className={`${studioFieldClass} mt-2`}
                  />
                  <button
                    type="button"
                    disabled={busy || (!sourceText.trim() && !bulkText.trim())}
                    onClick={() => void addLesson()}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 bg-brand-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Generate lesson
                  </button>
                </div>

                {moduleLessons.length === 0 ? (
                  <p className="py-6 text-center text-sm text-brand-ink/50">Type one English word or line. The classroom builds the German side for you.</p>
                ) : (
                  <ul className="overflow-hidden border border-brand-ink/10">
                    {moduleLessons.map((row, index) => {
                      const selected = (selectedId ?? active?.id) === row.id;
                      return (
                        <li
                          key={row.id}
                          className={`flex items-center gap-2 border-b border-brand-ink/10 px-3 py-3 text-sm last:border-b-0 ${
                            selected ? "bg-brand-muted" : index % 2 === 1 ? "bg-brand-muted/30" : "bg-brand-surface"
                          }`}
                        >
                          <div className="flex flex-col">
                            <button type="button" disabled={busy || index === 0} onClick={() => void moveLesson(row.id, -1)} aria-label="Move up">
                              <ChevronUp className="h-4 w-4 opacity-50" />
                            </button>
                            <button type="button" disabled={busy || index === moduleLessons.length - 1} onClick={() => void moveLesson(row.id, 1)} aria-label="Move down">
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </button>
                          </div>
                          <button type="button" onClick={() => syncEdit(row)} className="min-w-0 flex-1 text-left">
                            <span className="block font-semibold text-brand-ink">
                              Lesson {index + 1}: {row.target_text}
                            </span>
                            <span className="block text-xs text-brand-ink/60">{row.source_text}</span>
                          </button>
                          <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-brand-ink/40">Ready</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        </StudioPanel>

        <StudioPanel
          title="Lesson card"
          description={active ? "Generated for the classroom. Edit only if you need to." : "Pick a lesson"}
          action={
            active ? (
              <button type="button" onClick={() => void deleteLesson(active.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            ) : undefined
          }
          className={`xl:col-span-5 xl:sticky xl:top-24 xl:self-start ${mobilePane === "list" ? "hidden xl:block" : ""}`}
        >
          {active ? (
            <div className="space-y-5">
              <label className="block">
                <span className={studioLabelClass}>English</span>
                <input value={editSource} onChange={(e) => setEditSource(e.target.value)} className={studioFieldClass} />
              </label>
              <label className="block">
                <span className={studioLabelClass}>Generated German</span>
                <input value={editTarget} onChange={(e) => setEditTarget(e.target.value)} className={studioFieldClass} />
              </label>
              <label className="block">
                <span className={studioLabelClass}>Pronunciation</span>
                <input value={editIpa} onChange={(e) => setEditIpa(e.target.value)} placeholder="ˈha.lo" className={studioFieldClass} />
              </label>
              <label className="block">
                <span className={studioLabelClass}>When to use</span>
                <textarea value={editUsage} onChange={(e) => setEditUsage(e.target.value)} rows={2} className={studioFieldClass} />
              </label>
              <p className="flex items-center gap-2 text-xs text-brand-ink/50">
                <Volume2 className="h-4 w-4" /> Students hear the classroom teacher voice. No upload needed.
              </p>
              {audioPreviewUrl(active) ? <audio key={`${active.id}-${active.audio_url}`} controls preload="metadata" src={audioPreviewUrl(active) ?? undefined} className="w-full" /> : null}
              <details className="border border-brand-ink/10 px-3 py-2 text-sm">
                <summary className="cursor-pointer font-semibold">Optional recorded voice</summary>
                <div className="mt-3 space-y-3">
                  <Upload
                    key={`${active.id}-${active.audio_url ?? "empty"}-${busy ? "busy" : "idle"}`}
                    folder="lessons"
                    subfolder={`${course.id}/${active.id}`}
                    uploadUrl={`/api/studio/phrases/${active.id}/audio`}
                    accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/mp4,audio/aac"
                    label={active.audio_url ? "Replace audio" : "Upload audio"}
                    hint="Only if you want a recorded voice instead of classroom speech."
                    compact
                    onSuccess={async () => {
                      await loadCourse(slug);
                      showToast("Voice saved");
                    }}
                    onError={(msg) => setError(msg)}
                  />
                  {active.audio_url ? (
                    <button type="button" disabled={busy} onClick={() => void clearVoice()} className="text-xs font-semibold text-red-700">
                      Remove recorded voice
                    </button>
                  ) : null}
                  <input value={audioLink} onChange={(e) => setAudioLink(e.target.value)} placeholder="https://example.com/phrase.mp3" className={studioFieldClass} />
                </div>
              </details>
              <button type="button" disabled={busy} onClick={() => void saveLesson()} className="w-full border border-brand-ink bg-brand-ink py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                Save lesson
              </button>
            </div>
          ) : (
            <div className="flex min-h-[200px] items-center justify-center text-center text-sm text-brand-ink/55">
              Add a lesson in this module, then fill listen, pronounce, and usage.
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
