"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { formatScore, standings, type PublicView, type Team } from "@/lib/game";
import { Eyebrow } from "./parts";

const PODIUM = [
  // Display order left→right: 2nd, 1st, 3rd.
  { rank: 2, height: 290, className: "bg-[linear-gradient(180deg,#3569ff,#1231b0)]" },
  { rank: 1, height: 380, className: "bg-[linear-gradient(180deg,#ffd873,#e0a21c)] text-bg" },
  { rank: 3, height: 240, className: "bg-[linear-gradient(180deg,#1d3a9e,#0d1d66)]" },
];

export function WinnerScreen({ view }: { view: PublicView }) {
  const ranked = standings(view.teams);
  const top = ranked[0]?.score;
  const winners = ranked.filter((t) => t.score === top);
  const rest = ranked.slice(3);

  return (
    <div className="relative flex h-full flex-col items-center overflow-hidden bg-bg">
      <Spotlight />
      <Confetti colors={view.teams.map((t) => t.color)} />

      <div className="relative mt-[90px] flex flex-col items-center">
        <Eyebrow size={26} tone="text-gold">{view.title} · Champions</Eyebrow>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.3 }}
          className="mt-4 max-w-[1700px] text-center font-display text-[190px] font-black uppercase leading-[0.9] text-glow-gold-heavy"
        >
          {winners.map((w) => w.name).join(" & ")}
        </motion.div>
      </div>

      <div className="relative mt-auto flex items-end gap-6">
        {PODIUM.map(({ rank, height, className }, i) => {
          const team: Team | undefined = ranked[rank - 1];
          if (!team) return <div key={rank} className="w-[380px]" />;
          return (
            <motion.div
              key={rank}
              initial={{ height: 0 }}
              animate={{ height }}
              transition={{ delay: 0.8 + i * 0.15, type: "spring", stiffness: 120, damping: 18 }}
              className={`flex w-[380px] flex-col items-center overflow-hidden rounded-t-[20px] pt-6 ${className}`}
            >
              <div className="font-display text-[72px] font-black leading-none">{rank}</div>
              <div className="mt-2 flex items-center gap-3 px-4 text-[34px] font-semibold">
                <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: team.color }} />
                <span className="truncate">{team.name}</span>
              </div>
              <div className="font-display text-[52px] font-black">{formatScore(team.score)}</div>
            </motion.div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="absolute right-[64px] bottom-[48px] flex flex-col gap-2 text-right">
          {rest.map((t, i) => (
            <div key={t.id} className="text-[26px] text-text-muted">
              {i + 4}. {t.name} · <span className="font-display font-black">{formatScore(t.score)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Spotlight() {
  return (
    <motion.div
      className="pointer-events-none absolute top-0 left-1/2 h-[1400px] w-[1400px] origin-top"
      style={{
        x: "-50%",
        background:
          "conic-gradient(from 160deg at 50% 0%, transparent 0deg, rgba(255,230,160,0.22) 12deg, rgba(255,230,160,0.32) 20deg, rgba(255,230,160,0.22) 28deg, transparent 40deg)",
        filter: "blur(8px)",
      }}
      animate={{ rotate: [-14, 14, -14] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** Deterministic pseudo-random numbers, so re-renders don't reshuffle the confetti. */
function seededRandom(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function Confetti({ colors }: { colors: string[] }) {
  const pieces = useMemo(() => {
    const rand = seededRandom(7);
    const palette = colors.length ? [...colors, "#ffc53d"] : ["#ffc53d"];
    return Array.from({ length: 140 }, (_, i) => ({
      id: i,
      left: rand() * 1920,
      size: 10 + rand() * 14,
      color: palette[i % palette.length],
      delay: rand() * 4,
      duration: 4 + rand() * 4,
      drift: (rand() - 0.5) * 300,
      spin: (rand() - 0.5) * 1440,
      round: rand() > 0.6,
    }));
  }, [colors]);

  return (
    <div className="pointer-events-none absolute inset-0">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0"
          style={{
            left: p.left,
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            background: p.color,
            borderRadius: p.round ? "50%" : 2,
          }}
          initial={{ y: -40, x: 0, rotate: 0 }}
          animate={{ y: 1140, x: p.drift, rotate: p.spin }}
          transition={{ delay: p.delay, duration: p.duration, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}
