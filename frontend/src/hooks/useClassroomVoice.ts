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
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{ isFinal?: boolean; 0: { transcript: string } }>;
  }) => void) | null;
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

function appleSpeech() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iP(hone|ad|od)/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const safari = /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg|Firefox|FxiOS|OPR/i.test(ua);
  return iOS || iPadOS || safari;
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
  const appleRef = useRef(false);

  const clearClip = useCallback(() => {
    if (clipRef.current) URL.revokeObjectURL(clipRef.current);
    clipRef.current = null;
    setClipUrl(null);
  }, []);

  const dropRecorder = useCallback(() => {
    try {
      if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const hardAbortSpeech = useCallback(() => {
    const speech = speechRef.current;
    speechRef.current = null;
    if (!speech) return;
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
  }, []);

  const stop = useCallback(() => {
    liveRef.current = false;
    dropRecorder();
    const speech = speechRef.current;
    if (speech) {
      try {
        speech.stop();
      } catch {
        hardAbortSpeech();
        sessionRef.current += 1;
        setRecording(false);
        return;
      }
      window.setTimeout(() => {
        if (!liveRef.current) {
          hardAbortSpeech();
          setRecording(false);
        }
      }, 700);
      return;
    }
    sessionRef.current += 1;
    setRecording(false);
  }, [dropRecorder, hardAbortSpeech]);

  useEffect(() => {
    appleRef.current = appleSpeech();
    return () => {
      liveRef.current = false;
      sessionRef.current += 1;
      dropRecorder();
      hardAbortSpeech();
      if (clipRef.current) URL.revokeObjectURL(clipRef.current);
    };
  }, [dropRecorder, hardAbortSpeech]);

  const attachSpeech = useCallback(
    (Engine: new () => Rec, session: number) => {
      const apple = appleRef.current;
      const speech = new Engine();
      speech.lang = lang;
      speech.maxAlternatives = 1;
      speech.continuous = !apple;
      speech.interimResults = true;
      speech.onresult = (event) => {
        if (sessionRef.current !== session) return;
        let text = "";
        let sawFinal = false;
        for (let i = 0; i < event.results.length; i += 1) {
          const row = event.results[i];
          text += row?.[0]?.transcript ?? "";
          if (row?.isFinal) sawFinal = true;
        }
        const next = text.trim();
        if (!next) return;
        heardRef.current = next;
        setHeard(next);
        setError(null);
        if (apple && sawFinal) {
          liveRef.current = false;
          try {
            speech.stop();
          } catch {
            /* onend will finish */
          }
        }
      };
      speech.onerror = (event) => {
        if (sessionRef.current !== session) return;
        const code = event.error || "";
        if (code === "aborted") return;
        if (code === "no-speech") return;
        if (code === "not-allowed") {
          liveRef.current = false;
          setRecording(false);
          setError("Allow the microphone, then tap Speak again.");
          return;
        }
        if (code === "audio-capture" || code === "service-not-allowed") {
          setError("Safari could not use the microphone. Close other audio, then tap Speak.");
        }
      };
      speech.onend = () => {
        if (sessionRef.current !== session) return;
        speechRef.current = null;
        if (!liveRef.current) {
          sessionRef.current += 1;
          setRecording(false);
          return;
        }
        window.setTimeout(() => {
          if (sessionRef.current !== session || !liveRef.current) return;
          try {
            attachSpeech(Engine, session);
          } catch {
            liveRef.current = false;
            setRecording(false);
            setError("Speech stopped. Tap Speak and try again.");
          }
        }, apple ? 220 : 160);
      };
      speechRef.current = speech;
      speech.start();
    },
    [lang],
  );

  const start = useCallback(() => {
    if (liveRef.current) return;
    appleRef.current = appleSpeech();
    if (typeof window !== "undefined" && window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }
    hardAbortSpeech();
    dropRecorder();

    const session = sessionRef.current + 1;
    sessionRef.current = session;
    liveRef.current = true;
    setError(null);
    setHeard("");
    heardRef.current = "";
    clearClip();
    setRecording(true);

    const Engine = speechEngine();
    if (Engine) {
      try {
        attachSpeech(Engine, session);
      } catch {
        liveRef.current = false;
        setRecording(false);
        setError("Could not start speech. Tap Speak and allow the mic.");
      }
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      liveRef.current = false;
      setRecording(false);
      setError("This browser cannot take speech. Open Safari or Chrome and allow the microphone.");
      return;
    }

    void (async () => {
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
        const mime = MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "";
        const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        rec.ondataavailable = (event) => {
          if (event.data.size) chunksRef.current.push(event.data);
        };
        rec.onstop = () => {
          if (sessionRef.current !== session || !chunksRef.current.length) return;
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/mp4" });
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
    })();
  }, [attachSpeech, clearClip, dropRecorder, hardAbortSpeech]);

  const toggle = useCallback(() => {
    if (liveRef.current) stop();
    else start();
  }, [start, stop]);

  return { recording, heard, clipUrl, error, start, stop, toggle, clearClip, setHeard };
}
