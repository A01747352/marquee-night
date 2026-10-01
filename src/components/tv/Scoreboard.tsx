"use client";

import { motion } from "framer-motion";
import { formatScore, type Team } from "@/lib/game";

/** Bottom strip on the board: one card per team, the active team ringed in hot pink. */
export function Scoreboard({ teams, activeId }: { teams: Team[]; activeId: string | null }) {
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))` }}>
      {teams.map((t) => {
        const active = t.id === activeId;
        return (
          <div
            key={t.id}
            className={`relative flex h-[132px] items-center gap-6 rounded-[14px] border-2 border-panel-border bg-panel pr-8 ${active ? "ring-active" : ""}`}
          >
            <span className="h-full w-3 shrink-0 rounded-l-[12px]" style={{ background: t.color }} />
            {active && (
              <motion.span
                layoutId="picking-tag"
                className="absolute -top-[22px] left-6 rounded-full bg-hot px-4 py-1 font-mono text-[18px] tracking-[0.2em] text-white"
              >
                PICKING
              </motion.span>
            )}
            <div className="line-clamp-2 min-w-0 flex-1 text-[28px] leading-[1.1] font-semibold break-words">{t.name}</div>
            <div
              className={`font-display text-[58px] font-black tabular-nums ${t.score < 0 ? "text-wrong-soft" : "text-text"}`}
            >
              {formatScore(t.score)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
