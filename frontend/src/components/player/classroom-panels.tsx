"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Hash,
  Heart,
  ImagePlus,
  Menu,
  Lock,
  Mic,
  MicOff,
  MessageCircle,
  Monitor,
  Moon,
  PhoneOff,
  Plus,
  Repeat2,
  Settings,
  Share,
  Sun,
  Trophy,
  Users,
  Volume2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LogoMark, LogoTile } from "@/components/layout/LogoMark";
import { SpeechHeardFeedback } from "@/components/player/SpeechHeardFeedback";
import { useClassroomVoice } from "@/hooks/useClassroomVoice";
import { useClassroomMeeting } from "@/hooks/useClassroomMeeting";
import { useAppearance } from "@/components/theme/AppearanceMenu";
import { streakCount, todayKey, studentKid, type StudentLook, type TeacherVoice } from "@/lib/classroom-prefs";

type Author = { id: string; name: string; avatar_url?: string | null };
type Comment = { id: string; body: string; created_at: string; author: Author };
type Post = {
  id: string;
  space: string;
  channel: string;
  title: string | null;
  body: string;
  image_url?: string | null;
  kind?: string;
  link_url?: string | null;
  link_label?: string | null;
  detail?: string | null;
  created_at: string;
  author: Author;
  comment_count: number;
  comments?: Comment[];
};

const HUB_CHANNELS = [
  { id: "for-you", label: "For you" },
  { id: "following", label: "Following" },
  { id: "germany", label: "Germany" },
];

const TEXT_ROOMS = [
  { id: "general", label: "general" },
  { id: "german", label: "german" },
  { id: "campus", label: "campus" },
  { id: "jobs", label: "jobs" },
  { id: "help", label: "help" },
];

const VOICE_ROOMS = [
  { id: "lounge", label: "Lounge" },
  { id: "german-hour", label: "German Hour" },
  { id: "office", label: "Office hours" },
];

async function loadFeed(space: string, channel?: string) {
  const qs = new URLSearchParams({ space });
  if (channel && channel !== "all") qs.set("channel", channel);
  const res = await fetch(`/api/classroom/feed?${qs}`, { credentials: "include", cache: "no-store" });
  const body = await res.json().catch(() => []);
  return Array.isArray(body) ? (body as Post[]) : [];
}

function ago(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function TweetCard({
  post,
  reply,
  onReplyChange,
  onReply,
}: {
  post: Post;
  reply: string;
  onReplyChange: (value: string) => void;
  onReply: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const official = post.kind === "germany" || post.kind === "news";
  const handle = official ? "germanydesk" : post.author.name.split(" ")[0].toLowerCase();
  return (
    <article className="border-b border-[#eff3f4] px-4 py-3 hover:bg-black/[0.03] dark:border-[#2f3336] dark:hover:bg-white/[0.03]">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1457D0] text-sm font-bold text-white">
          {post.author.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1 text-[15px] leading-5">
            <span className="font-bold">{post.author.name}</span>
            {official ? <BadgeCheck className="h-4 w-4 fill-[#1457D0] text-white" /> : null}
            <span className="text-[#536471] dark:text-[#71767b]">
              @{handle} · {ago(post.created_at)}
            </span>
          </p>
          {post.title ? <p className="mt-0.5 text-[15px] font-semibold">{post.title}</p> : null}
          {post.body ? <p className="mt-1 whitespace-pre-wrap text-[15px] leading-5">{post.body}</p> : null}
          {post.detail && open ? <p className="mt-2 text-[15px] leading-6 text-[#0f1419]/80 dark:text-[#e7e9ea]/80">{post.detail}</p> : null}
          {post.detail ? (
            <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 text-[15px] font-semibold text-[#1457D0]">
              {open ? "Show less" : "Show more"}
            </button>
          ) : null}
          {post.link_url ? (
            <a
              href={post.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block overflow-hidden rounded-2xl border border-[#cfd9de] dark:border-[#2f3336]"
            >
              {post.image_url ? <img src={post.image_url} alt="" className="h-44 w-full object-cover" /> : null}
              <span className="block px-3 py-2">
                <span className="block text-[13px] text-[#536471]">{post.link_label || hostOf(post.link_url)}</span>
                <span className="block text-[15px] font-semibold">{post.title}</span>
                <span className="block truncate text-[13px] text-[#536471]">
                  {post.kind === "news" ? "Today in Germany · full story" : "Official source · full details"}
                </span>
              </span>
            </a>
          ) : post.image_url ? (
            <img src={post.image_url} alt="" className="mt-3 max-h-80 w-full rounded-2xl object-cover" />
          ) : null}
          <div className="mt-3 flex max-w-md justify-between text-[#536471]">
            <button type="button" className="inline-flex items-center gap-1 hover:text-[#1457D0]" aria-label="Reply">
              <MessageCircle className="h-4 w-4" />
              <span className="text-[13px]">{post.comment_count}</span>
            </button>
            <span className="inline-flex items-center gap-1">
              <Repeat2 className="h-4 w-4" />
            </span>
            <button type="button" onClick={() => setLiked((v) => !v)} className={`inline-flex items-center gap-1 ${liked ? "text-rose-500" : "hover:text-rose-500"}`} aria-label="Like">
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            </button>
            <span className="inline-flex items-center gap-1">
              <Bookmark className="h-4 w-4" />
            </span>
            <span className="inline-flex items-center gap-1">
              <Share className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={reply}
              onChange={(e) => onReplyChange(e.target.value)}
              placeholder="Post your reply"
              className="h-9 min-w-0 flex-1 rounded-full bg-[#eff3f4] px-3 text-sm outline-none dark:bg-[#202327]"
            />
            <button type="button" onClick={onReply} className="text-[13px] font-bold text-[#1457D0]">
              Reply
            </button>
          </div>
          {(post.comments ?? []).map((item) => (
            <p key={item.id} className="mt-1 text-[13px] text-[#536471]">
              <span className="font-semibold text-inherit">{item.author.name}</span> {item.body}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}

export function ClassroomGermanyDesk() {
  const [channel, setChannel] = useState("for-you");
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setPosts(await loadFeed("hub", channel));
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [channel]);

  async function attach(file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/media/upload?folder=general&subfolder=hub", { method: "POST", credentials: "include", body: form });
    const data = await res.json().catch(() => null);
    const url = data?.file?.public_url as string | undefined;
    if (url) setPhoto(url);
  }

  async function publish() {
    if (!body.trim() && !photo) return;
    setBusy(true);
    try {
      const dest = ["for-you", "following", "germany", "all"].includes(channel) ? "study" : channel;
      await fetch("/api/classroom/feed", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space: "hub", channel: dest, body, image_url: photo }),
      });
      setBody("");
      setPhoto(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function comment(postId: string) {
    const text = (reply[postId] || "").trim();
    if (!text) return;
    await fetch(`/api/classroom/feed/${postId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setReply((prev) => ({ ...prev, [postId]: "" }));
    await refresh();
  }

  const trending = posts.filter((post) => post.kind === "news" || post.kind === "germany").slice(0, 5);

  return (
    <div className="flex h-full min-h-0 justify-center gap-4 overflow-hidden text-[#0f1419] dark:text-[#e7e9ea]">
      <div className="flex min-h-0 w-full max-w-[598px] flex-col border-x-0 bg-white sm:border-x sm:border-[#eff3f4] dark:bg-black dark:sm:border-[#2f3336]">
        <div className="flex items-center gap-2 border-b border-[#eff3f4] px-4 py-3 dark:border-[#2f3336]">
          <LogoMark size="md" />
          <p className="text-[15px] font-extrabold">Germany Desk</p>
        </div>
        <div className="grid grid-cols-3 border-b border-[#eff3f4] dark:border-[#2f3336]">
          {HUB_CHANNELS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setChannel(item.id)}
              className={`py-3 text-[13px] font-medium sm:text-[15px] ${
                channel === item.id ? "font-bold shadow-[inset_0_-4px_0_#1457D0]" : "text-[#536471]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 border-b border-[#eff3f4] px-4 py-3 dark:border-[#2f3336]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1457D0] text-sm font-bold text-white">You</span>
          <div className="min-w-0 flex-1">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              maxLength={280}
              placeholder="What is happening?"
              className="w-full resize-none bg-transparent text-base outline-none placeholder:text-[#536471] sm:text-[20px]"
            />
            {photo ? <img src={photo} alt="" className="mt-2 max-h-56 w-full rounded-2xl object-cover" /> : null}
            <div className="mt-2 flex items-center justify-between">
              <button type="button" onClick={() => fileRef.current?.click()} className="text-[#1457D0]" aria-label="Add photo">
                <ImagePlus className="h-5 w-5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void attach(e.target.files?.[0])} />
              <button
                type="button"
                disabled={busy || (!body.trim() && !photo)}
                onClick={() => void publish()}
                className="h-9 rounded-full bg-[#1457D0] px-4 text-[15px] font-bold text-white disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {posts.map((post) => (
            <TweetCard
              key={post.id}
              post={post}
              reply={reply[post.id] ?? ""}
              onReplyChange={(value) => setReply((prev) => ({ ...prev, [post.id]: value }))}
              onReply={() => void comment(post.id)}
            />
          ))}
        </div>
      </div>
      <aside className="hidden w-[350px] shrink-0 overflow-y-auto pt-1 xl:block">
        <div className="rounded-2xl bg-[#f7f9f9] p-3 dark:bg-[#16181c]">
          <p className="px-2 pb-2 text-xl font-extrabold">What&apos;s happening</p>
          {trending.map((post) => (
            <a
              key={post.id}
              href={post.link_url || "#"}
              target={post.link_url ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="block rounded-xl px-2 py-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
            >
              <p className="text-[13px] text-[#536471]">Germany · {post.channel}</p>
              <p className="text-[15px] font-bold leading-5">{post.title}</p>
              <p className="text-[13px] text-[#536471]">{post.link_label}</p>
            </a>
          ))}
        </div>
      </aside>
    </div>
  );
}

export function ClassroomCommunity() {
  const voice = useClassroomVoice("en-NG");
  const [room, setRoom] = useState("general");
  const [voiceRoom, setVoiceRoom] = useState<string | null>(null);
  const meeting = useClassroomMeeting(voiceRoom);
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  async function refresh() {
    setPosts(await loadFeed("community", room));
  }

  useEffect(() => {
    void refresh();
  }, [room]);

  useEffect(() => {
    if (!voice.recording && voice.heard) setText(voice.heard);
  }, [voice.recording, voice.heard]);

  useEffect(() => {
    if (voiceRoom) void meeting.join();
  }, [voiceRoom]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [posts.length, voiceRoom]);

  const online = useMemo(() => {
    const names = new Map<string, string>();
    for (const post of posts) names.set(post.author.id, post.author.name);
    for (const member of meeting.members) names.set(member.id, member.name);
    return [...names.entries()];
  }, [posts, meeting.members]);

  async function send() {
    const body = text.trim() || voice.heard.trim();
    if (!body) return;
    setBusy(true);
    try {
      await fetch("/api/classroom/feed", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space: "community", channel: room, body }),
      });
      setText("");
      voice.clearClip();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const channelLabel = voiceRoom
    ? VOICE_ROOMS.find((item) => item.id === voiceRoom)?.label
    : TEXT_ROOMS.find((item) => item.id === room)?.label;

  function pickTextRoom(id: string) {
    if (voiceRoom) {
      void meeting.leave();
      setVoiceRoom(null);
    }
    setRoom(id);
    setChannelsOpen(false);
  }

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden rounded-[18px]">
      {channelsOpen ? (
        <button
          type="button"
          className="absolute inset-0 z-20 bg-[#10244F]/40 md:hidden"
          aria-label="Close channels"
          onClick={() => setChannelsOpen(false)}
        />
      ) : null}
      <aside className="cr-dc-rail hidden w-[72px] shrink-0 flex-col items-center gap-3 py-3 lg:flex">
        <LogoTile className="h-12 w-12 rounded-[16px]" />
        <span className="h-[2px] w-8 rounded-full bg-white/20" />
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg" title="Germany">
          🇩🇪
        </span>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg" title="Campus">
          🎓
        </span>
        <button type="button" className="mt-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10" aria-label="Add">
          <Plus className="h-5 w-5" />
        </button>
      </aside>

      <aside
        className={`cr-dc-chan absolute inset-y-0 left-0 z-30 w-[min(16.5rem,86vw)] flex-col md:relative md:z-auto md:flex md:w-[15.5rem] md:shrink-0 ${
          channelsOpen ? "flex" : "hidden"
        }`}
      >
        <div className="flex h-12 items-center justify-between gap-2 border-b border-black/10 px-3 dark:border-white/10">
          <span className="flex min-w-0 items-center gap-2">
            <LogoMark size="sm" />
            <p className="truncate text-sm font-extrabold">Multivate</p>
          </span>
          <button type="button" className="md:hidden" aria-label="Close channels" onClick={() => setChannelsOpen(false)}>
            <ChevronLeft className="h-4 w-4 opacity-70" />
          </button>
          <Settings className="hidden h-4 w-4 opacity-50 md:block" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider opacity-50">Text channels</p>
          {TEXT_ROOMS.map((item) => {
            const on = room === item.id && !voiceRoom;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => pickTextRoom(item.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-semibold ${
                  on ? "bg-[#1457D0] text-white" : "opacity-70 hover:bg-[var(--cr-dc-hover)] hover:opacity-100"
                }`}
              >
                <Hash className="h-4 w-4" /> {item.label}
              </button>
            );
          })}
          <p className="mt-4 px-2 pb-1 text-[11px] font-bold uppercase tracking-wider opacity-50">Voice channels</p>
          {VOICE_ROOMS.map((item) => {
            const on = voiceRoom === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setVoiceRoom(item.id);
                  setChannelsOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-semibold ${
                  on ? "bg-[#1457D0]/20 text-[#23a559]" : "opacity-70 hover:bg-[var(--cr-dc-hover)] hover:opacity-100"
                }`}
              >
                <Volume2 className="h-4 w-4" /> {item.label}
                {on ? <span className="ml-auto h-2 w-2 rounded-full bg-[#23a559]" /> : null}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 border-t border-black/10 px-3 py-2 dark:border-white/10">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1457D0] text-xs font-bold text-white">You</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold">You</p>
            <p className="truncate text-[10px] text-[#23a559]">{voiceRoom ? "Voice connected" : "Online"}</p>
          </div>
          <button type="button" onClick={() => setMuted((v) => !v)} className="opacity-70" aria-label="Mute">
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <section className="cr-dc-chat flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 min-w-0 items-center gap-2 border-b border-black/10 px-3 sm:px-4 dark:border-white/10">
          <button type="button" className="md:hidden" aria-label="Open channels" onClick={() => setChannelsOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <LogoMark size="sm" />
          {voiceRoom ? <Volume2 className="h-5 w-5 shrink-0 opacity-60" /> : <Hash className="h-5 w-5 shrink-0 opacity-60" />}
          <p className="min-w-0 truncate text-sm font-extrabold">{channelLabel}</p>
          <p className="cr-muted hidden min-w-0 truncate text-xs lg:block">
            {voiceRoom ? "Join the voice room. Allow the microphone when asked." : "Discussion for Multivate learners preparing for Germany."}
          </p>
          <Users className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </header>

        {voiceRoom ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <p className="text-lg font-extrabold">Voice connected · {channelLabel}</p>
            <p className="cr-muted mt-1 text-sm">This is a live voice room. People who join appear here.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {meeting.members.map((member) => (
                <div key={member.id} className="rounded-2xl bg-black/10 p-4 text-center dark:bg-white/5">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1457D0] text-lg font-bold text-white">
                    {member.name.slice(0, 1).toUpperCase()}
                  </span>
                  <p className="mt-2 text-sm font-bold">{member.name}</p>
                  <p className="text-[11px] text-[#23a559]">Speaking</p>
                </div>
              ))}
            </div>
            {meeting.error ? <p className="mt-3 text-sm text-rose-500">{meeting.error}</p> : null}
            <button
              type="button"
              onClick={() => {
                void meeting.leave();
                setVoiceRoom(null);
              }}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-rose-500 px-4 text-sm font-bold text-white"
            >
              <PhoneOff className="h-4 w-4" /> Disconnect
            </button>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
              {posts.length === 0 ? (
                <div className="py-16 text-center">
                  <LogoMark className="mx-auto" />
                  <p className="mt-4 text-lg font-extrabold">Welcome to #{channelLabel}</p>
                  <p className="cr-muted mx-auto mt-1 max-w-sm text-sm">
                    Introduce yourself and practise German with other learners preparing for work, study, or life in Germany.
                  </p>
                </div>
              ) : null}
              {posts.map((post) => (
                <article key={post.id} className="flex gap-2 rounded-lg px-1 py-1 hover:bg-[var(--cr-dc-hover)] sm:gap-3 sm:px-2">
                  {/multivate/i.test(post.author.name) ? (
                    <LogoTile className="mt-0.5 h-10 w-10 rounded-full" />
                  ) : (
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1457D0] text-sm font-bold text-white">
                      {post.author.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {post.author.name}{" "}
                      <span className="ml-1 text-[11px] font-medium opacity-50">{ago(post.created_at)}</span>
                    </p>
                    <p className="mt-0.5 text-[15px] leading-5">{post.body}</p>
                  </div>
                </article>
              ))}
              <div ref={endRef} />
            </div>
            <form
              className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-4"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <div className="flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2 dark:bg-black/20">
                <button type="button" className="hidden opacity-50 sm:inline" aria-label="Attach" disabled>
                  <Plus className="h-5 w-5" />
                </button>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Message #${channelLabel}`}
                  className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => voice.toggle()}
                  className={voice.recording ? "text-rose-500" : "opacity-70"}
                  aria-label="Speak"
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button type="submit" disabled={busy} className="rounded-md bg-[#1457D0] px-3 py-1.5 text-xs font-bold text-white">
                  Send
                </button>
              </div>
            </form>
          </>
        )}
      </section>

      <aside className="cr-dc-chan hidden w-[15rem] shrink-0 flex-col border-l border-black/10 xl:flex dark:border-white/10">
        <p className="px-4 pt-4 text-[11px] font-bold uppercase tracking-wider opacity-50">Online: {Math.max(1, online.length)}</p>
        <div className="mt-2 space-y-1 px-2">
          {online.length === 0 ? (
            <p className="px-2 text-xs opacity-50">You are here</p>
          ) : (
            online.map(([id, name]) => (
              <div key={id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#1457D0] text-xs font-bold text-white">
                  {name.slice(0, 1).toUpperCase()}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--cr-dc-chan)] bg-[#23a559]" />
                </span>
                <span className="truncate text-sm font-semibold">{name}</span>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

function ScoreRing({ value, size = 132 }: { value: number; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mx-auto -rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="opacity-15" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="#1457D0"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
      />
    </svg>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
}

export function ClassroomProgress({
  overallScore,
  readiness,
  xp,
  modules,
  practiceDays,
}: {
  overallScore: number;
  readiness: number;
  xp: number;
  modules: {
    id: string;
    title: string;
    lessons: number;
    learned: number;
    scorePct: number | null;
    passed: boolean;
    locked: boolean;
  }[];
  practiceDays: string[];
}) {
  const passed = modules.filter((row) => row.passed).length;
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const marked = useMemo(() => new Set(practiceDays), [practiceDays]);
  const streak = streakCount(practiceDays);
  const today = todayKey();
  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-3 overflow-y-auto">
      <section className="cr-surface flex flex-wrap items-center gap-4 rounded-[22px] p-4 sm:gap-6 sm:p-5">
        <div className="relative w-[120px] shrink-0">
          <ScoreRing value={overallScore} size={120} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-extrabold">{overallScore}%</p>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-55">Score</p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold">My Progress</h1>
          <p className="cr-muted mt-1 text-sm">Complete a module, then pass its 20-question assessment to unlock the next.</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="cr-surface-soft rounded-[14px] px-2 py-3">
              <p className="text-lg font-extrabold">{xp}</p>
              <p className="cr-muted text-[10px] font-bold uppercase">XP</p>
            </div>
            <div className="cr-surface-soft rounded-[14px] px-2 py-3">
              <p className="text-lg font-extrabold">{readiness}%</p>
              <p className="cr-muted text-[10px] font-bold uppercase">Ready</p>
            </div>
            <div className="cr-surface-soft rounded-[14px] px-2 py-3">
              <p className="text-lg font-extrabold">
                {passed}/{modules.length}
              </p>
              <p className="cr-muted text-[10px] font-bold uppercase">Passed</p>
            </div>
          </div>
        </div>
      </section>
      <section className="cr-surface rounded-[22px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-extrabold">
              <Flame className={`h-4 w-4 ${streak ? "text-amber-500" : "opacity-40"}`} />
              Daily streak
            </p>
            <p className="cr-muted mt-1 text-xs">A day is marked when you finish a lesson, practise speaking, or send a real-life reply.</p>
          </div>
          <div className="cr-surface-soft rounded-full px-4 py-2 text-center">
            <p className="text-xl font-extrabold leading-none">{streak}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-55">{streak === 1 ? "day" : "days"}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            className="cr-chip inline-flex h-8 w-8 items-center justify-center rounded-full"
            aria-label="Previous month"
            onClick={() =>
              setCursor((prev) =>
                prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 },
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-extrabold">{monthLabel(cursor.year, cursor.month)}</p>
          <button
            type="button"
            className="cr-chip inline-flex h-8 w-8 items-center justify-center rounded-full"
            aria-label="Next month"
            onClick={() =>
              setCursor((prev) =>
                prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 },
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((day) => (
            <p key={day} className="cr-muted py-1 text-[10px] font-bold uppercase tracking-wide">
              {day}
            </p>
          ))}
          {cells.map((day, index) => {
            if (!day) return <span key={`empty-${index}`} />;
            const key = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const done = marked.has(key);
            const isToday = key === today;
            return (
              <span
                key={key}
                title={done ? `Class completed ${key}` : key}
                className={`relative flex h-9 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? "bg-[#1457D0]/12 text-[#10244F]"
                    : isToday
                      ? "ring-2 ring-[#1457D0] ring-offset-1 ring-offset-[var(--cr-surface)]"
                      : "cr-muted"
                }`}
              >
                {day}
                {done ? (
                  <CheckCircle2
                    className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-[#1457D0] text-white"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                ) : null}
              </span>
            );
          })}
        </div>
      </section>
      <div className="grid content-start gap-3 sm:grid-cols-2">
        {modules.map((row, index) => (
          <article key={row.id} className="cr-surface rounded-[22px] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-50">Module {index + 1}</p>
                <h2 className="mt-1 text-base font-extrabold">{row.title}</h2>
                <p className="cr-muted mt-1 text-xs">
                  {row.learned}/{row.lessons} lessons learned
                </p>
              </div>
              {row.locked ? <Lock className="h-4 w-4 opacity-40" /> : row.passed ? <Trophy className="h-4 w-4 text-amber-400" /> : null}
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-extrabold text-[#1457D0]">{row.scorePct == null ? "-" : `${row.scorePct}%`}</p>
                <p className="cr-muted text-[11px] font-bold uppercase tracking-wide">
                  {row.locked ? "Locked" : row.scorePct == null ? "No score yet" : row.passed ? "Passed" : "Retry"}
                </p>
              </div>
              <div className="cr-surface-soft h-2 w-24 overflow-hidden rounded-full">
                <div className="h-full rounded-full bg-[#1457D0]" style={{ width: `${row.scorePct ?? 0}%` }} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ClassroomSettings({
  look,
  teacher,
  onLook,
  onTeacher,
}: {
  look: StudentLook;
  teacher: TeacherVoice;
  onLook: (look: StudentLook) => void;
  onTeacher: (voice: TeacherVoice) => void;
}) {
  const voice = useClassroomVoice("de-DE");
  const { choice, choose } = useAppearance();
  return (
    <div className="mx-auto grid h-full min-h-0 w-full max-w-4xl gap-3 overflow-y-auto lg:grid-cols-2">
      <section className="cr-surface rounded-[22px] p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-55">Appearance</p>
        <h2 className="mt-1 text-lg font-extrabold">Classroom theme</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(
            [
              { id: "light" as const, label: "Light", icon: Sun },
              { id: "dark" as const, label: "Dark", icon: Moon },
              { id: "system" as const, label: "System", icon: Monitor },
            ]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => choose(item.id)}
              className={`rounded-[16px] px-3 py-4 text-sm font-semibold ${choice === item.id ? "bg-[#1457D0] text-white" : "cr-chip"}`}
            >
              <item.icon className="mx-auto mb-2 h-5 w-5" />
              {item.label}
            </button>
          ))}
        </div>
      </section>
      <section className="cr-surface rounded-[22px] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-55">Your look</p>
        <h2 className="mt-1 text-lg font-extrabold">Classroom character</h2>
        <p className="cr-muted mt-1 text-sm">Kids in class follow this look.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(["boy", "girl"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onLook(item)}
              className={`rounded-[18px] border p-3 ${look === item ? "border-[#1457D0] bg-[#1457D0]/10" : "border-transparent cr-chip"}`}
            >
              <img src={studentKid(item)} alt="" className="mx-auto h-24 w-auto object-contain object-bottom" />
              <p className="mt-2 text-sm font-extrabold">{item === "boy" ? "Boy" : "Girl"}</p>
            </button>
          ))}
        </div>
      </section>
      <section className="cr-surface rounded-[22px] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-55">Teacher voice</p>
        <h2 className="mt-1 text-lg font-extrabold">Who you hear</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(["female", "male"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onTeacher(item)}
              className={`rounded-[16px] px-3 py-4 text-sm font-semibold ${teacher === item ? "bg-[#1457D0] text-white" : "cr-chip"}`}
            >
              {item === "female" ? "Woman" : "Man"}
            </button>
          ))}
        </div>
        <p className="cr-muted mt-3 text-xs">Tap a voice to hear a sample line.</p>
      </section>
      <section className="cr-surface rounded-[22px] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-55">Microphone</p>
        <h2 className="mt-1 text-lg font-extrabold">Test speak</h2>
        <p className="cr-muted mt-1 text-sm">Allow access, then say Hallo.</p>
        <button
          type="button"
          onClick={() => voice.toggle()}
          className={`mt-4 h-12 rounded-full px-5 text-sm font-semibold text-white ${voice.recording ? "bg-rose-500" : "bg-[#1457D0]"}`}
        >
          {voice.recording ? "Stop" : "Speak"}
        </button>
        <SpeechHeardFeedback
          expect="Hallo"
          heard={voice.heard}
          recording={voice.recording}
          error={voice.error}
          clipUrl={voice.clipUrl}
          missHint="Heard a different line. Aim for: Hallo"
        />
        <Link href="/dashboard/settings" className="mt-6 inline-block text-sm font-semibold text-[#1457D0]">
          Account settings
        </Link>
      </section>
    </div>
  );
}
