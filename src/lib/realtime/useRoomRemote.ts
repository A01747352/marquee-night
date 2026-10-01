"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, HostView } from "@/lib/game";
import { connectRoom, randomId, type LinkStatus, type RoomLink, type RoomSettings } from "./room";

const HELLO_RETRY_MS = 3000;
const PING_MS = 10_000;
const ACK_TIMEOUT_MS = 6000;

/**
 * Phone side of the room: says hello until the TV answers with the full state,
 * keeps the link alive, and sends actions with an ack per action.
 */
export function useRoomRemote(roomCode: string | null) {
  const [status, setStatus] = useState<LinkStatus>("connecting");
  const [view, setView] = useState<HostView | null>(null);
  const [settings, setSettings] = useState<RoomSettings>({ muted: false });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkRef = useRef<RoomLink | null>(null);
  const clientId = useRef("");
  const gotState = useRef(false);
  const waiting = useRef(new Map<string, (error: string | null) => void>());

  useEffect(() => {
    if (!roomCode) return;
    clientId.current ||= randomId();
    gotState.current = false;
    const room = connectRoom(roomCode);
    linkRef.current = room;
    const hello = () => room.send("hello", { clientId: clientId.current });

    const offs = [
      room.onStatus((s) => {
        setStatus(s);
        if (s === "live") hello(); // also fires after a reconnect
      }),
      room.on("state", ({ view, settings }) => {
        gotState.current = true;
        setView(view);
        setSettings(settings);
      }),
      room.on("ack", ({ clientId: to, id, error }) => {
        if (to !== clientId.current) return;
        waiting.current.get(id)?.(error);
      }),
    ];

    // Keep saying hello until the TV answers (it may not be open yet), then ping.
    const timer = setInterval(() => {
      if (!gotState.current) hello();
    }, HELLO_RETRY_MS);
    const ping = setInterval(() => {
      if (gotState.current) room.send("ping", { clientId: clientId.current });
    }, PING_MS);
    // Phones suspend tabs; resync when we come back.
    const onVisible = () => {
      if (document.visibilityState === "visible") hello();
    };
    document.addEventListener("visibilitychange", onVisible);
    const pendingActions = waiting.current;

    return () => {
      offs.forEach((off) => off());
      clearInterval(timer);
      clearInterval(ping);
      document.removeEventListener("visibilitychange", onVisible);
      pendingActions.clear();
      room.close();
      linkRef.current = null;
    };
  }, [roomCode]);

  /** Sends an action; resolves with an error message, or null if the TV applied it. */
  const act = useCallback((action: Action): Promise<string | null> => {
    const room = linkRef.current;
    if (!room) return Promise.resolve("Not connected.");
    const id = randomId();
    setPending(true);
    setError(null);
    return new Promise((resolve) => {
      const done = (err: string | null) => {
        clearTimeout(timeout);
        waiting.current.delete(id);
        setPending(waiting.current.size > 0);
        if (err) setError(err);
        resolve(err);
      };
      const timeout = setTimeout(() => done("The TV didn't respond. Is the game open on the big screen?"), ACK_TIMEOUT_MS);
      waiting.current.set(id, done);
      room.send("action", { clientId: clientId.current, id, action });
    });
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setSettings((s) => ({ ...s, muted }));
    linkRef.current?.send("settings", { clientId: clientId.current, settings: { muted } });
  }, []);

  return { status, view, settings, act, pending, error, clearError: () => setError(null), setMuted };
}
