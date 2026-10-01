"use client";

import { motion } from "framer-motion";
import type { PublicPhase, Team } from "@/lib/game";
import { FitText, ResultChip } from "./parts";

type RevealPhase = Extract<PublicPhase, { kind: "reveal" }>;

export function RevealScreen({ phase, teams }: { phase: RevealPhase; teams: Team[] }) {
  return (
    <div className="bg-question-glow flex h-full flex-col items-center px-[120px] pt-[64px] pb-[72px]">
      <div className="flex items-baseline gap-6">
        <span className="font-display text-[44px] font-extrabold uppercase tracking-[0.08em]">{phase.category}</span>
        <span className="font-display text-[52px] font-black text-glow-gold">{phase.value}</span>
      </div>
      <FitText
        max={44}
        min={26}
        step={2}
        className="mt-6 h-[150px] w-full max-w-[1500px] text-center leading-[1.2] text-text-muted text-balance"
      >
        {phase.question}
      </FitText>

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="answer-card mt-8 flex h-[400px] w-full max-w-[1560px] items-center justify-center px-16"
      >
        <FitText
          max={200}
          min={72}
          step={6}
          className="flex h-full w-full items-center justify-center text-center font-display font-black uppercase leading-[0.95] text-balance"
        >
          {phase.answer}
        </FitText>
      </motion.div>

      <div className="mt-auto flex gap-8">
        {phase.results.map((r, i) => {
          const team = teams.find((t) => t.id === r.teamId);
          if (!team) return null;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.2 }}
            >
              <ResultChip result={r} team={team} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
