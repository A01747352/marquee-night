"use client";

import { motion } from "framer-motion";
import { formatScore, type PublicPhase, type Team } from "@/lib/game";
import { AnimatedScore } from "./motion";
import { QuestionLayout } from "./QuestionScreen";
import { Eyebrow, FitText, TeamDot } from "./parts";

type Phase<K extends PublicPhase["kind"]> = Extract<PublicPhase, { kind: K }>;

/** 1f · category reveal + wager lock-in. */
export function FinalWagerScreen({ phase, teams }: { phase: Phase<"finalWager">; teams: Team[] }) {
  return (
    <div className="bg-final flex h-full flex-col items-center px-[100px] pt-[110px] pb-[72px]">
      <Eyebrow size={26} tone="text-gold">Final round</Eyebrow>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 16 }}
        className="mt-4 w-full"
      >
        <FitText
          max={180}
          min={90}
          step={6}
          className="h-[200px] w-full text-center font-display font-black uppercase leading-none tracking-[0.04em] text-glow-gold"
        >
          {phase.category}
        </FitText>
      </motion.div>
      <div className="mt-8 text-[40px] text-text-muted">Wager in secret. The host is entering bets now.</div>

      <div
        className="mt-auto grid w-full gap-6"
        style={{ gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))` }}
      >
        {teams.map((t) => {
          const status = phase.status[t.id];
          const label = status === "locked" ? "LOCKED IN" : status === "wagering" ? "WAGERING…" : "SITS OUT";
          const tone =
            status === "locked"
              ? "border-correct text-correct-soft"
              : status === "wagering"
                ? "border-gold/60 text-gold"
                : "border-panel-border text-text-dim";
          return (
            <div
              key={t.id}
              className={`flex flex-col gap-3 rounded-[16px] border-2 bg-panel/80 px-8 py-7 ${tone} ${status ? "" : "opacity-60"}`}
            >
              <div className="flex items-center gap-4">
                <TeamDot color={t.color} size={22} />
                <span className="truncate text-[32px] font-semibold text-text">{t.name}</span>
              </div>
              <div className="font-display text-[56px] font-black leading-none text-text">{formatScore(t.score)}</div>
              <div className="font-mono text-[20px] tracking-[0.24em]">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The final question itself, on the purple background. */
export function FinalQuestionScreen({ phase, teams }: { phase: Phase<"finalQuestion">; teams: Team[] }) {
  const playing = teams.filter((t) => phase.teamIds.includes(t.id));
  return (
    <QuestionLayout
      background="bg-final"
      heading={
        <>
          <Eyebrow size={26} tone="text-gold">Final round</Eyebrow>
          <div className="mt-2 font-display text-[64px] font-black uppercase leading-none tracking-[0.06em]">
            {phase.category}
          </div>
        </>
      }
      timer={phase.timer}
      question={phase.question}
      media={phase.media}
      footer={
        <div className="flex items-center gap-8 text-[30px] font-semibold">
          <span className="text-text-muted">Write your answers:</span>
          {playing.map((t) => (
            <span key={t.id} className="flex items-center gap-3">
              <TeamDot color={t.color} size={20} />
              {t.name}
            </span>
          ))}
        </div>
      }
    />
  );
}

/** 1g · team-by-team reveal. */
export function FinalRevealScreen({ phase, teams }: { phase: Phase<"finalReveal">; teams: Team[] }) {
  const nextId = phase.order.find((id) => !(id in phase.revealed));
  return (
    <div className="bg-final flex h-full flex-col px-[100px] pt-[64px] pb-[72px]">
      <div className="flex items-start justify-between gap-16">
        <div className="min-w-0 flex-1">
          <Eyebrow tone="text-gold">Final round · {phase.category}</Eyebrow>
          <FitText max={48} min={32} className="mt-3 h-[130px] font-semibold leading-[1.15] text-balance">
            {phase.question}
          </FitText>
        </div>
        <div className="max-w-[560px] shrink-0 rounded-[14px] border-2 border-gold/50 bg-panel/70 px-7 py-5">
          <div className="font-mono text-[18px] tracking-[0.24em] text-text-dim">ANSWER</div>
          <div className="mt-1 font-mono text-[34px] text-gold">{phase.answer}</div>
        </div>
      </div>

      <div
        className="mt-auto grid gap-6"
        style={{ gridTemplateColumns: `repeat(${phase.order.length}, minmax(0, 1fr))` }}
      >
        {phase.order.map((id) => {
          const team = teams.find((t) => t.id === id);
          const r = phase.revealed[id];
          if (!team) return null;
          if (!r) {
            return (
              <div
                key={id}
                className={`flex h-[520px] flex-col rounded-[18px] border-[3px] border-dashed px-8 py-8 ${id === nextId ? "border-gold/70" : "border-panel-border"}`}
              >
                <div className="flex items-center gap-4">
                  <TeamDot color={team.color} size={22} />
                  <span className="truncate text-[34px] font-semibold">{team.name}</span>
                </div>
                <div className="m-auto font-mono text-[24px] tracking-[0.3em] text-text-dim">
                  {id === nextId ? "UP NEXT" : "WAITING"}
                </div>
              </div>
            );
          }
          return (
            <motion.div
              key={id}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={`flex h-[520px] flex-col rounded-[18px] border-[3px] bg-panel px-8 py-8 ${r.correct ? "border-correct shadow-[0_0_50px_rgba(47,191,91,0.4)]" : "border-wrong shadow-[0_0_40px_rgba(229,72,77,0.3)]"}`}
            >
              <div className="flex items-center gap-4">
                <TeamDot color={team.color} size={22} />
                <span className="truncate text-[34px] font-semibold">{team.name}</span>
              </div>
              <FitText
                max={96}
                min={40}
                className="my-4 flex min-h-0 flex-1 items-center font-display font-black uppercase leading-[0.95] text-balance"
              >
                {r.answer || (r.correct ? "Correct" : "Wrong")}
              </FitText>
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-mono text-[18px] tracking-[0.24em] text-text-dim">WAGER</div>
                  <div
                    className={`font-display text-[64px] font-black leading-none ${r.correct ? "text-correct-soft" : "text-wrong-soft"}`}
                  >
                    {r.correct ? "+" : "−"}
                    {r.wager}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[18px] tracking-[0.24em] text-text-dim">SCORE</div>
                  <div className="font-display text-[64px] font-black leading-none">
                    <AnimatedScore teamId={team.id} score={team.score} delay={0.6} deltaClassName="text-[40px]" />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
