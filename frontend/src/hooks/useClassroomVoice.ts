"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  abort: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal?: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function speechEngine() {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Rec;
    webkitSpeechRecognition?: new () => Rec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useClassroomVoice(lang = "de-DE") {
  const [recording, setRecording] = useState(false);
  const [heard, setHeard] = useState("");
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRef = useRef<Rec | null>(null);
  const clipRef = useRef<string | null>(null);
  const heardRef = useRef("");
  const liveRef = useRef(false);
  const sessionRef = useRef(0);

  const clearClip = useCallback(() => {
    if (clipRef.current) URL.revokeObjectURL(clipRef.current);
    clipRef.current = null;
    setClipUrl(null);
  }, []);

  const releaseMic = useCallback(() => {
    const speech = speechRef.current;
    speechRef.current = null;
    if (speech) {
      speech.onend = null;
      speech.onerror = null;
      speech.onresult = null;
      try {
        speech.abort();
      } catch {
        try {
          speech.stop();
        } catch {
          /* ignore */
        }
      }
    }
    try {
      if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    liveRef.current = false;
    releaseMic();
    setRecording(false);
  }, [releaseMic]);

  useEffect(() => {
    return () => {
      stop();
      if (clipRef.current) URL.revokeObjectURL(clipRef.current);
    };
  }, [stop]);

  const startSpeech = useCallback(
    (Engine: new () => Rec, session: number) => {
      const speech = new Engine();
      speech.lang = lang;
      speech.interimResults = true;
      speech.continuous = true;
      speech.maxAlternatives = 3;
      speech.onresult = (event) => {
        if (sessionRef.current !== session) return;
        let text = "";
        for (let i = 0; i < event.results.length; i += 1) {
          text += event.results[i]?.[0]?.transcript ?? "";
        }
        heardRef.current = text.trim();
        setHeard(text.trim());
      };
      speech.onerror = (event) => {
        if (sessionRef.current !== session) return;
        const code = event.error || "";
        if (code === "aborted" || code === "no-speech") return;
        if (code === "not-allowed") {
          setError("Allow the microphone, then tap Speak again.");
          liveRef.current = false;
          setRecording(false);
          return;
        }
        if (code === "audio-capture") {
          setError("The microphone was still busy. Tap Speak once more.");
        }
      };
      speech.onend = () => {
        if (sessionRef.current !== session || !liveRef.current) return;
        window.setTimeout(() => {
          if (sessionRef.current !== session || !liveRef.current) return;
          try {
            speech.start();
          } catch {
            /* Chrome is still closing the last session */
          }
        }, 180);
      };
      speechRef.current = speech;
      speech.start();
    },
    [lang],
  );

  const start = useCallback(async () => {
    if (liveRef.current) return;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    releaseMic();

    const session = sessionRef.current + 1;
    sessionRef.current = session;
    liveRef.current = true;
    setError(null);
    setHeard("");
    heardRef.current = "";
    clearClip();
    setRecording(true);

    const Engine = speechEngine();
    if (!Engine && !navigator.mediaDevices?.getUserMedia) {
      liveRef.current = false;
      setRecording(false);
      setError("This browser cannot take speech. Open Chrome and allow the microphone.");
      return;
    }

    if (Engine) {
      try {
        startSpeech(Engine, session);
      } catch {
        liveRef.current = false;
        setRecording(false);
        setError("Could not start speech. Tap Speak and allow the mic.");
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (sessionRef.current !== session || !liveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      rec.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      rec.onstop = () => {
        if (sessionRef.current !== session || !chunksRef.current.length) return;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 200) return;
        const url = URL.createObjectURL(blob);
        clipRef.current = url;
        setClipUrl(url);
      };
      rec.start(250);
      recRef.current = rec;
    } catch {
      liveRef.current = false;
      setRecording(false);
      setError("Allow the microphone to speak.");
    }
  }, [clearClip, releaseMic, startSpeech]);

  const toggle = useCallback(() => {
    if (liveRef.current) stop();
    else void start();
  }, [start, stop]);

  return { recording, heard, clipUrl, error, start, stop, toggle, clearClip, setHeard };
}
