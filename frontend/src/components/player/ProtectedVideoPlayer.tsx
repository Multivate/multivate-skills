"use client";

import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  src?: string | null;
  embedUrl?: string | null;
  title?: string;
  initialTime?: number;
  playbackRate?: number;
  onTimeUpdate?: (seconds: number) => void;
  onEnded?: () => void;
  className?: string;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ProtectedVideoPlayer({
  src,
  embedUrl,
  title = "Lesson video",
  initialTime = 0,
  playbackRate = 1,
  onTimeUpdate,
  onEnded,
  className = "",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<number | null>(null);

  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = window.setTimeout(() => setShowControls(false), 2800);
    }
  }, [playing]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || embedUrl) return;
    el.playbackRate = playbackRate;
  }, [playbackRate, embedUrl, src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || embedUrl) return;
    const apply = () => {
      if (initialTime > 0 && el.duration > initialTime) {
        el.currentTime = initialTime;
      }
    };
    el.addEventListener("loadedmetadata", apply);
    return () => el.removeEventListener("loadedmetadata", apply);
  }, [initialTime, embedUrl, src]);

  const togglePlay = async () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      await el.play().catch(() => undefined);
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
    bumpControls();
  };

  const seekTo = (ratio: number) => {
    const el = videoRef.current;
    if (!el || !duration) return;
    el.currentTime = Math.max(0, Math.min(duration, ratio * duration));
    bumpControls();
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    bumpControls();
  };

  const toggleFullscreen = () => {
    const root = videoRef.current?.parentElement;
    if (!root) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void root.requestFullscreen();
    }
    bumpControls();
  };

  if (embedUrl) {
    return (
      <div
        className={`relative aspect-video w-full overflow-hidden bg-black ${className}`}
        onContextMenu={(e) => e.preventDefault()}
      >
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  if (!src) {
    return (
      <div className={`flex aspect-video w-full items-center justify-center bg-slate-900 text-sm text-white/70 ${className}`}>
        Add a video to preview it here
      </div>
    );
  }

  return (
    <div
      className={`group relative aspect-video w-full overflow-hidden bg-black ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      onMouseMove={bumpControls}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        key={src}
        ref={videoRef}
        src={src}
        className="h-full w-full object-contain"
        playsInline
        preload="metadata"
        controlsList="nodownload noremoteplayback nofullscreen"
        disablePictureInPicture
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          const el = videoRef.current;
          if (!el) return;
          setCurrent(el.currentTime);
          onTimeUpdate?.(el.currentTime);
        }}
        onLoadedMetadata={() => {
          const el = videoRef.current;
          if (el) setDuration(el.duration || 0);
        }}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
      />

      {!playing ? (
        <button
          type="button"
          onClick={() => void togglePlay()}
          className="absolute inset-0 flex items-center justify-center bg-black/25 transition hover:bg-black/35"
          aria-label="Play video"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-accent text-white shadow-lg transition hover:scale-105">
            <Play className="ml-1 h-7 w-7 fill-current" />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void togglePlay()}
          className="absolute inset-0"
          aria-label="Pause video"
        />
      )}

      <div
        className={`absolute inset-x-0 bottom-0 bg-black/80 px-4 pb-3 pt-8 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          ref={barRef}
          role="slider"
          aria-label="Seek"
          tabIndex={0}
          className="group/bar h-1.5 cursor-pointer rounded-full bg-white/25"
          onClick={(e) => {
            const rect = barRef.current?.getBoundingClientRect();
            if (!rect) return;
            seekTo((e.clientX - rect.left) / rect.width);
          }}
        >
          <div
            className="h-full rounded-full bg-brand-accent transition-all group-hover/bar:h-2"
            style={{ width: duration ? `${(current / duration) * 100}%` : "0%" }}
          />
        </div>
        <div className="mt-2 flex items-center gap-3 text-white">
          <button type="button" onClick={() => void togglePlay()} className="rounded-lg p-1 hover:bg-white/10" aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
          </button>
          <button type="button" onClick={toggleMute} className="rounded-lg p-1 hover:bg-white/10" aria-label={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <span className="text-xs tabular-nums text-white/90">
            {formatTime(current)} / {formatTime(duration)}
          </span>
          <button type="button" onClick={toggleFullscreen} className="ml-auto rounded-lg p-1 hover:bg-white/10" aria-label="Fullscreen">
            <Maximize2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
