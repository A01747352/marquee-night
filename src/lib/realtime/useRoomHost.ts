"use client";

import { useEffect, useRef, useState } from "react";
import { toHostView, type Action, type GameState } from "@/lib/game";
import { connectRoom, type LinkStatus, type RoomLink, type RoomSettings } from "./room";

/** The host counts as connected if we heard from them this recently. */
const HOST_TIMEOUT_MS = 25_000;

/**
 * TV side of the room: applies actions from the phone, answers hellos with the
 * full state, and pushes a fresh HostView whenever the game changes.
 */
export function useRoomHost({
  roomCode,
  state,
  settings,
  dispatch,
  setMuted,
}: {
  roomCode: string | null;
  state: GameState | null;
  settings: RoomSettings;
  dispatch: (action: Action) => string | null;
  setMuted: (muted: boolean) => void;
}) {
  const [link, setLink] = useState<RoomLink | null>(null);
  const [status, setStatus] = useState<LinkStatus>("connecting");
  const [hostSeenAt, setHostSeenAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  // Latest values for the message handlers, which are registered once per room.
  const latest = useRef({ state, settings, dispatch, setMuted });
  useEffect(() => {
    latest.current = { state, settings, dispatch, setMuted };
  });

  useEffect(() => {
    if (!roomCode) return;
    const room = connectRoom(roomCode);
    const sendState = () => {
      const { state, settings } = latest.current;
      if (state) room.send("state", { view: toHostView(state, Date.now()), settings });
    };
    const seen = () => setHostSeenAt(Date.now());

    const offs = [
      room.onStatus(setStatus),
      room.on("hello", () => {
        seen();
        sendState();
      }),
      room.on("ping", seen),
      room.on("action", ({ clientId, id, action }) => {
        seen();
        const error = latest.current.dispatch(action);
        room.send("ack", { clientId, id, error });
        // On error the state didn't change, so no state push would follow;
        // send one anyway so a confused phone resyncs.
        if (error) sendState();
      }),
      room.on("settings", ({ settings }) => {
        seen();
        latest.current.setMuted(settings.muted);
      }),
    ];
    setLink(room);
    return () => {
      offs.forEach((off) => off());
      room.close();
      setLink(null);
    };
  }, [roomCode]);

  // Push the host view on every change (including timer start/pause).
  useEffect(() => {
    if (link && state) link.send("state", { view: toHostView(state, Date.now()), settings });
  }, [link, state, settings]);

  // Re-evaluate "host connected" every few seconds.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const hostConnected = hostSeenAt !== null && (now === 0 || now - hostSeenAt < HOST_TIMEOUT_MS);
  return { status, hostConnected };
}
