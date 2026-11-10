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

  const clearClip = useCallback(() => {
    if (clipRef.current) URL.revokeObjectURL(clipRef.current);
    clipRef.current = null;
    setClipUrl(null);
  }, []);

  const stop = useCallback(() => {
    liveRef.current = false;
    try {
      if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    } catch {
      /* ignore */
    }
    try {
      speechRef.current?.stop();
    } catch {
      /* ignore */
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recRef.current = null;
    speechRef.current = null;
    setRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      stop();
      if (clipRef.current) URL.revokeObjectURL(clipRef.current);
    };
  }, [stop]);

  const startSpeech = useCallback(
    (Engine: new () => Rec) => {
      const speech = new Engine();
      speech.lang = lang;
      speech.interimResults = true;
      speech.continuous = true;
      speech.maxAlternatives = 1;
      speech.onresult = (event) => {
        let text = "";
        for (let i = 0; i < event.results.length; i += 1) {
          text += event.results[i]?.[0]?.transcript ?? "";
        }
        heardRef.current = text.trim();
        setHeard(text.trim());
      };
      speech.onerror = (event) => {
        if (event.error === "not-allowed") {
          setError("Allow the microphone, then tap Speak again.");
          liveRef.current = false;
          setRecording(false);
        } else if (event.error === "no-speech") {
          setError("No speech heard. Tap Speak, talk, then tap Stop.");
        }
      };
      speech.onend = () => {
        if (!liveRef.current) return;
        try {
          speech.start();
        } catch {
          /* Chrome ended the session */
        }
      };
      speechRef.current = speech;
      speech.start();
    },
    [lang],
  );

  const start = useCallback(async () => {
    if (liveRef.current) return;
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
        startSpeech(Engine);
      } catch {
        setError("Could not start speech. Tap Speak and allow the mic.");
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (!liveRef.current) {
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
        if (!chunksRef.current.length) return;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 200) return;
        const url = URL.createObjectURL(blob);
        clipRef.current = url;
        setClipUrl(url);
      };
      rec.start(250);
      recRef.current = rec;
    } catch {
      if (!Engine) {
        liveRef.current = false;
        setRecording(false);
        setError("Allow the microphone to speak.");
      }
    }
  }, [clearClip, startSpeech]);

  const toggle = useCallback(() => {
    if (liveRef.current || recording) stop();
    else void start();
  }, [recording, start, stop]);

  return { recording, heard, clipUrl, error, start, stop, toggle, clearClip, setHeard };
}
