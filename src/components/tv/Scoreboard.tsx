"use client";

import { motion } from "framer-motion";
import type { Team } from "@/lib/game";
import { AnimatedScore, useSlidingActive } from "./motion";

/** Bottom strip on the board: one card per team, the active team ringed in hot pink. */
export function Scoreboard({ teams, activeId }: { teams: Team[]; activeId: string | null }) {
  // Starts on the previous picker, then slides to the new one.
  const ringOn = useSlidingActive(activeId);

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))` }}>
      {teams.map((t) => (
        <div
          key={t.id}
          className="relative flex h-[132px] items-center gap-6 rounded-[14px] border-2 border-panel-border bg-panel pr-8"
        >
          {t.id === ringOn && (
            <motion.div
              layoutId="active-ring"
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="pointer-events-none absolute -inset-[10px] rounded-[22px] border-4 border-hot shadow-[0_0_32px_rgba(255,62,165,0.6)]"
            >
              <span className="absolute -top-[18px] left-7 rounded-full bg-hot px-4 py-1 font-mono text-[18px] tracking-[0.2em] text-white">
                PICKING
              </span>
            </motion.div>
          )}
          <span className="h-full w-3 shrink-0 rounded-l-[12px]" style={{ background: t.color }} />
          <div className="line-clamp-2 min-w-0 flex-1 text-[28px] leading-[1.1] font-semibold break-words">{t.name}</div>
          <AnimatedScore
            teamId={t.id}
            score={t.score}
            className="font-display text-[58px] font-black tabular-nums"
            deltaClassName="text-[40px]"
          />
        </div>
      ))}
    </div>
  );
}
