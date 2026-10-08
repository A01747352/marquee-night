"use client";

import { motion } from "framer-motion";
import { CHOICE_LETTERS, STREAK_BONUS_EVERY, STREAK_SHOW, type PublicPhase, type Team, type TileResult } from "@/lib/game";
import { FitText, ResultChip } from "./parts";

type RevealPhase = Extract<PublicPhase, { kind: "reveal" }>;

export function RevealScreen({ phase, teams }: { phase: RevealPhase; teams: Team[] }) {
  const choice = phase.type === "multipleChoice" ? phase.options.indexOf(phase.answer) : -1;
  const answer = choice >= 0 ? `${CHOICE_LETTERS[choice]} · ${phase.answer}` : phase.answer;
  const hot = streakMoment(phase.results, teams);

  return (
    <div className={`${phase.deepCut ? "bg-deep-glow" : "bg-question-glow"} relative flex h-full flex-col items-center px-[120px] pt-[64px] pb-[72px]`}>
      <div className="flex items-baseline gap-6">
        <span className="font-display text-[44px] font-extrabold uppercase tracking-[0.08em]">{phase.category}</span>
        <span className={`font-display text-[52px] font-black ${phase.deepCut ? "text-glow-blood" : "text-glow-gold"}`}>{phase.value}</span>
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
        {phase.answerLines ? (
          <ol className="flex w-full flex-col gap-3">
            {phase.answerLines.map((line, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.18 }}
                className="flex items-baseline gap-6 font-display text-[60px] font-black uppercase leading-none"
              >
                <span className="w-[60px] text-right opacity-60">{i + 1}</span>
                <span className="truncate">{line}</span>
              </motion.li>
            ))}
          </ol>
        ) : (
          <FitText
            max={200}
            min={72}
            step={6}
            className="flex h-full w-full items-center justify-center text-center font-display font-black uppercase leading-[0.95] text-balance"
          >
            {answer}
          </FitText>
        )}
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

      {hot && <StreakBanner {...hot} />}
    </div>
  );
}

/** The newest result that's worth celebrating: a streak of 3+ just extended. */
function streakMoment(results: TileResult[], teams: Team[]) {
  const r = [...results].reverse().find((x) => x.delta > 0 && (x.streak ?? 0) >= STREAK_SHOW);
  const team = r && teams.find((t) => t.id === r.teamId);
  if (!r || !team) return null;
  return { team, streak: r.streak!, bonus: r.streakBonus ?? 0 };
}

function StreakBanner({ team, streak, bonus }: { team: Team; streak: number; bonus: number }) {
  const big = streak >= STREAK_BONUS_EVERY;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, rotate: -4 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.08, 1, 0.96], rotate: [-4, 2, 0, 0] }}
      transition={{ delay: 0.9, duration: 3.2, times: [0, 0.15, 0.8, 1] }}
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
    >
      <div
        className={`flex flex-col items-center rounded-[32px] border-4 px-20 py-10 backdrop-blur ${big ? "border-[#ff7a2f] bg-[#2a0a04]/85 shadow-[0_0_120px_rgba(255,110,40,0.7)]" : "border-[#ff9a4d]/70 bg-[#1a0a10]/80 shadow-[0_0_70px_rgba(255,110,40,0.45)]"}`}
      >
        <div className="font-display text-[160px] leading-none">{big ? "🔥🔥" : "🔥"}</div>
        <div className="mt-2 font-display text-[120px] font-black uppercase leading-none text-[#ffb36b] [text-shadow:0_0_40px_rgba(255,120,40,0.8)]">
          {streak} streak
        </div>
        <div className="mt-3 text-[40px] font-semibold">{team.name}</div>
        {bonus > 0 && (
          <div className="mt-4 rounded-full bg-gold px-10 py-2 font-display text-[64px] font-black text-bg">+{bonus} BONUS</div>
        )}
      </div>
    </motion.div>
  );
}
