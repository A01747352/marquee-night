"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { HostApp } from "@/components/host/HostApp";
import { Wordmark } from "@/components/tv/parts";
import { useRoomRemote } from "@/lib/realtime/useRoomRemote";

const LAST_ROOM_KEY = "marquee-night:last-room";
const CODE_PATTERN = /^[A-Z0-9]{4}$/;

const subscribeNoop = () => () => {};
function readLastRoom(): string | null {
  try {
    return localStorage.getItem(LAST_ROOM_KEY);
  } catch {
    return null;
  }
}

export default function HostPage() {
  return (
    <Suspense fallback={null}>
      <Host />
    </Suspense>
  );
}

function Host() {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("room")?.toUpperCase() ?? "";
  const room = CODE_PATTERN.test(raw) ? raw : null;
  const remote = useRoomRemote(room);

  useEffect(() => {
    if (room) {
      try {
        localStorage.setItem(LAST_ROOM_KEY, room);
      } catch {}
    }
  }, [room]);

  if (!room) return <JoinForm onJoin={(code) => router.replace(`/host?room=${code}`)} />;

  return (
    <HostApp
      roomCode={room}
      {...remote}
      onLeave={() => {
        try {
          localStorage.removeItem(LAST_ROOM_KEY);
        } catch {}
        router.replace("/host");
      }}
    />
  );
}

function JoinForm({ onJoin }: { onJoin: (code: string) => void }) {
  const [code, setCode] = useState("");
  const last = useSyncExternalStore(subscribeNoop, readLastRoom, () => null);

  const valid = CODE_PATTERN.test(code);

  return (
    <main className="bg-board-glow mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <Wordmark size={56} />
      <form
        className="flex w-full flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onJoin(code);
        }}
      >
        <label htmlFor="room" className="font-mono text-[12px] uppercase tracking-[0.2em] text-text-muted">
          Enter the room code on the TV
        </label>
        <input
          id="room"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="K7QX"
          className="h-[96px] w-full rounded-[18px] border-[3px] border-gold bg-panel text-center font-display text-[64px] font-black tracking-[0.2em] text-gold outline-none placeholder:text-text-dim/40"
        />
        <button
          type="submit"
          disabled={!valid}
          className="h-[72px] rounded-[16px] bg-gold font-display text-[24px] font-black uppercase tracking-[0.08em] text-bg disabled:opacity-40"
        >
          Join as host
        </button>
      </form>
      {last && (
        <button type="button" onClick={() => onJoin(last)} className="h-12 px-4 text-[16px] font-semibold text-text-muted underline">
          Rejoin room {last}
        </button>
      )}
    </main>
  );
}
