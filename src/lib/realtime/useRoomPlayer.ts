"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerView } from "@/lib/game";
import { connectRoom, randomId, type LinkStatus } from "./room";

const HELLO_RETRY_MS = 3000;

export interface PlayerIdentity {
  id: string;
  name: string;
  imageUrl?: string;
}

/**
 * A player's phone: joins the room as a signed-in player and follows the
 * PlayerView. Re-sends the join on every reconnect (joining is idempotent),
 * so a TV refresh or a sleeping phone sorts itself out.
 */
export function useRoomPlayer(roomCode: string | null, player: PlayerIdentity | null) {
  const [status, setStatus] = useState<LinkStatus>("connecting");
  const [view, setView] = useState<PlayerView | null>(null);
  const [nightId, setNightId] = useState<string | null>(null);
  const clientId = useRef("");
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  });

  const playerKey = player ? `${player.id}|${player.name}|${player.imageUrl ?? ""}` : null;

  useEffect(() => {
    if (!roomCode || !playerKey) return;
    clientId.current ||= randomId();
    let gotView = false;
    const room = connectRoom(roomCode);
    const hello = () => {
      const p = playerRef.current;
      if (p) room.send("join", { clientId: clientId.current, player: p });
      room.send("playerHello", { clientId: clientId.current });
    };

    const offs = [
      room.onStatus((s) => {
        setStatus(s);
        if (s === "live") hello();
      }),
      room.on("players", ({ view, nightId }) => {
        gotView = true;
        setView(view);
        setNightId(nightId);
      }),
    ];
    // The TV may not be open yet: keep knocking until it answers.
    const timer = setInterval(() => {
      if (!gotView) hello();
    }, HELLO_RETRY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") hello();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      offs.forEach((off) => off());
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      room.close();
    };
  }, [roomCode, playerKey]);

  return { status, view, nightId };
}
