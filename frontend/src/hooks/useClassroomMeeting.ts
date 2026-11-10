"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Member = { id: string; name: string; room: string };

export function useClassroomMeeting(room: string | null) {
  const [members, setMembers] = useState<Member[]>([]);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const leave = useCallback(async () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setJoined(false);
    if (room) {
      await fetch("/api/classroom/voice", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, action: "leave" }),
      }).catch(() => null);
    }
    setMembers([]);
  }, [room]);

  const join = useCallback(async () => {
    if (!room) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const res = await fetch("/api/classroom/voice", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, action: "join" }),
      });
      const body = await res.json().catch(() => []);
      if (!res.ok) {
        throw new Error(typeof body?.detail === "string" ? body.detail : "Could not join voice.");
      }
      setMembers(Array.isArray(body) ? body : []);
      setJoined(true);
    } catch (err) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setError(err instanceof Error ? err.message : "Allow the microphone to join voice.");
      setJoined(false);
    }
  }, [room]);

  useEffect(() => {
    if (!joined || !room) return;
    const tick = window.setInterval(() => {
      void fetch("/api/classroom/voice", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, action: "heartbeat" }),
      })
        .then((res) => res.json())
        .then((body) => {
          if (Array.isArray(body)) setMembers(body);
        })
        .catch(() => null);
    }, 4000);
    return () => window.clearInterval(tick);
  }, [joined, room]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { members, joined, error, join, leave };
}
