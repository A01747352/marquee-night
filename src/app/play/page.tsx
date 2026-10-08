"use client";

import { Show, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { PlayerScreen } from "@/components/play/PlayerScreen";
import { Wordmark } from "@/components/tv/parts";
import { authEnabled } from "@/lib/auth";
import { joinNight } from "@/lib/leaderboard";
import { useRoomPlayer } from "@/lib/realtime/useRoomPlayer";

const CODE_PATTERN = /^[A-Z0-9]{4}$/;

export default function PlayPage() {
  if (!authEnabled) {
    return (
      <main className="bg-board-glow mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-6 px-6 text-center">
        <Wordmark size={44} />
        <p className="text-text-muted">
          Player accounts aren&apos;t set up on this server, so there&apos;s nothing to join on your phone. The host can
          still run the game.
        </p>
        <Link href="/host" className="font-semibold text-gold underline">
          I&apos;m the host
        </Link>
      </main>
    );
  }
  return (
    <Suspense fallback={null}>
      <Play />
    </Suspense>
  );
}

function Play() {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("room")?.toUpperCase() ?? "";
  const room = CODE_PATTERN.test(raw) ? raw : null;

  return (
    <main className="bg-board-glow mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <header className="mb-5 flex items-center justify-between gap-3 py-2">
        <Wordmark size={30} />
        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>

      <Show when="signed-out">
        <SignInPrompt room={room} />
      </Show>
      <Show when="signed-in">
        {room ? (
          <Joined room={room} onLeave={() => router.replace("/play")} />
        ) : (
          <CodeForm onJoin={(code) => router.replace(`/play?room=${code}`)} />
        )}
      </Show>
    </main>
  );
}

function SignInPrompt({ room }: { room: string | null }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      {room && <div className="font-mono text-[13px] tracking-[0.2em] text-text-dim">ROOM {room}</div>}
      <h1 className="font-display text-[44px] font-black uppercase leading-[0.95]">Join the game</h1>
      <p className="max-w-[320px] text-[16px] text-text-muted">
        Sign in so your points count on the season leaderboard. Teams get shuffled each night; your ranking follows you.
      </p>
      <div className="flex w-full flex-col gap-3">
        <SignInButton mode="modal">
          <button className="h-[64px] rounded-[16px] bg-gold font-display text-[24px] font-black uppercase tracking-[0.08em] text-bg">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="h-[52px] rounded-[16px] bg-panel font-semibold ring-2 ring-panel-border">Create an account</button>
        </SignUpButton>
      </div>
      <Link href={room ? `/host?room=${room}` : "/host"} className="text-[14px] font-semibold text-text-dim underline">
        I&apos;m the host
      </Link>
    </div>
  );
}

function CodeForm({ onJoin }: { onJoin: (code: string) => void }) {
  const [code, setCode] = useState("");
  const valid = CODE_PATTERN.test(code);
  return (
    <form
      className="flex flex-1 flex-col justify-center gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onJoin(code);
      }}
    >
      <label htmlFor="room" className="text-center font-mono text-[12px] uppercase tracking-[0.2em] text-text-muted">
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
        Join
      </button>
      <Link href="/leaderboard" className="mt-4 text-center text-[14px] font-semibold text-text-dim underline">
        Season leaderboard
      </Link>
    </form>
  );
}

function Joined({ room, onLeave }: { room: string; onLeave: () => void }) {
  const { user } = useUser();
  const identity = useMemo(() => {
    if (!user) return null;
    const name =
      user.fullName?.trim() || user.username?.trim() || user.primaryEmailAddress?.emailAddress.split("@")[0] || "Player";
    return { id: user.id, name, imageUrl: user.imageUrl };
  }, [user]);
  const { status, view, nightId } = useRoomPlayer(room, identity);
  const [nightError, setNightError] = useState<string | null>(null);
  const registered = useRef<string | null>(null);

  // Register for the season night once per night, from this signed-in phone.
  useEffect(() => {
    if (!nightId || registered.current === nightId) return;
    registered.current = nightId;
    joinNight(nightId).then((err) => {
      setNightError(err);
      if (err) registered.current = null; // try again on the next update
    });
  }, [nightId, view]);

  if (!view || !identity) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-panel-border border-t-gold" />
        <div className="text-[18px] font-semibold">Joining room {room}…</div>
        <p className="max-w-[300px] text-[15px] text-text-muted">
          {status === "offline" ? "You're offline. Reconnecting…" : "Make sure the game is open on the big screen."}
        </p>
        <button type="button" onClick={onLeave} className="h-11 px-4 text-[15px] font-semibold text-text-dim underline">
          Use a different code
        </button>
      </div>
    );
  }

  return <PlayerScreen view={view} me={identity.id} room={room} live={status === "live"} ranked={!!nightId} nightError={nightError} />;
}
