"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { LocalControls } from "@/components/tv/LocalControls";
import { Stage } from "@/components/tv/Stage";
import { TvDisplay } from "@/components/tv/TvDisplay";
import { isLocalOnly } from "@/lib/realtime/room";
import { useRoomHost } from "@/lib/realtime/useRoomHost";
import { useTvGame } from "@/lib/useTvGame";

const subscribeNoop = () => () => {};

export default function TvPage() {
  const { status, session, state, publicView, dispatch, error, setMuted } = useTvGame();
  const origin = useSyncExternalStore(subscribeNoop, () => window.location.origin, () => "");
  const muted = !!session?.muted;
  const settings = useMemo(() => ({ muted }), [muted]);
  const { hostConnected } = useRoomHost({
    roomCode: session?.roomCode ?? null,
    state,
    settings,
    dispatch,
    setMuted,
  });

  if (status === "loading") return <div className="fixed inset-0 bg-bg" />;

  if (status === "missing" || !session || !publicView) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
        <p className="text-xl text-text-muted">No game is set up on this screen yet.</p>
        <Link href="/" className="rounded-xl bg-gold px-6 py-3 font-semibold text-bg">
          Set up a game
        </Link>
      </main>
    );
  }

  const joinUrl = `${origin}/host?room=${session.roomCode}`;

  return (
    <>
      <Stage>
        <TvDisplay
          view={publicView}
          roomCode={session.roomCode}
          joinUrl={joinUrl}
          hostConnected={hostConnected}
          localOnly={isLocalOnly}
          onPick={(col, row) => dispatch({ type: "pickTile", col, row })}
        />
      </Stage>
      <LocalControls view={publicView} dispatch={dispatch} error={error} />
    </>
  );
}
