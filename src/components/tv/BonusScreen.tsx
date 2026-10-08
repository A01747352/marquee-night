"use client";

import { motion } from "framer-motion";
import type { PublicPhase, Team } from "@/lib/game";

type BonusPhase = Extract<PublicPhase, { kind: "bonusReveal" }>;

export function BonusScreen({ phase, teams }: { phase: BonusPhase; teams: Team[] }) {
  const team = teams.find((t) => t.id === phase.teamId);
  const wager = phase.reason === "wager";
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-bg">
      <div className="bonus-rays absolute top-1/2 left-1/2 h-[3200px] w-[3200px] -translate-x-1/2 -translate-y-1/2 animate-spin-slow" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_50%_50%,transparent_0%,rgba(5,8,24,0.75)_65%,#050818_100%)]" />

      <div className="relative flex flex-col items-center">
        <div className="mb-8 font-mono text-[26px] uppercase tracking-[0.3em] text-gold">
          {phase.category} · {phase.value}
        </div>
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 13, delay: 0.15 }}
          className="font-display text-[300px] font-black leading-[0.95] tracking-[0.02em] text-glow-gold-heavy"
        >
          {wager ? "WAGER!" : "BONUS!"}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-4 flex flex-col items-center gap-4"
        >
          <div className="text-[56px] font-semibold">
            {team ? `${team.name}, how much will you risk?` : "How much will you risk?"}
          </div>
          <div className="text-[32px] text-text-muted">
            {wager ? "You'll see the question after you bet" : "Bonus tile"} · up to {phase.maxWager} · no steal
          </div>
        </motion.div>
      </div>
    </div>
  );
}
