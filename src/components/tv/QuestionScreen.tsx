"use client";

import { motion } from "framer-motion";
import { CHOICE_LETTERS, QUESTION_TYPES, type Media, type PublicPhase, type QuestionType, type Team, type TimerView } from "@/lib/game";
import { FitText, MediaBlock, StreakBadge, TeamDot, TimerRing, TypeTag } from "./parts";

type QuestionPhase = Extract<PublicPhase, { kind: "question" }>;

export function QuestionScreen({ phase, teams }: { phase: QuestionPhase; teams: Team[] }) {
  const answering = teams.find((t) => t.id === phase.answeringId);
  const deep = phase.deepCut;
  const tag = QUESTION_TYPES[phase.type].tag;
  const stakeLabel = phase.isBonus ? `${phase.type === "wager" ? "WAGER" : "BONUS"} · ${phase.stake}` : phase.value;

  return (
    <QuestionLayout
      background={deep ? "bg-deep-glow" : "bg-question-glow"}
      heading={
        <>
          <div className="font-display text-[48px] font-extrabold uppercase leading-none tracking-[0.08em]">
            {phase.category}
          </div>
          <div className="mt-2 flex items-center gap-6">
            <span className={`font-display text-[64px] font-black leading-none ${deep ? "text-glow-blood" : "text-glow-gold"}`}>
              {stakeLabel}
            </span>
            {deep && <TypeTag tone="blood">💀 Deep cut</TypeTag>}
            {tag && <TypeTag tone={deep ? "blood" : "gold"}>{tag}</TypeTag>}
          </div>
        </>
      }
      timer={phase.timer}
      question={phase.question}
      media={phase.media}
      body={
        HAS_BODY.includes(phase.type) ? (
          <TypeBody type={phase.type} question={phase.question} options={phase.options} media={phase.media} />
        ) : undefined
      }
      footer={
        phase.stage === "all" ? (
          <div className="flex items-center gap-8 text-[32px] font-semibold">
            <span className="text-text-muted">Every team, write down a number:</span>
            {teams.map((t) => (
              <span key={t.id} className="flex items-center gap-3">
                <TeamDot color={t.color} size={20} />
                {t.name}
              </span>
            ))}
          </div>
        ) : (
          answering && (
            <div className="flex items-center gap-5 text-[36px] font-semibold">
              <TeamDot color={answering.color} size={26} />
              <span>{answering.name}</span>
              <span className="text-text-muted">{phase.stage === "steal" ? "· steal attempt" : "answering"}</span>
              <StreakBadge streak={answering.streak} size={20} />
              {phase.stage === "steal" && (
                <span className="ml-3 rounded-full border-2 border-steal px-5 py-1 font-mono text-[18px] tracking-[0.2em] text-steal">
                  RISK-FREE
                </span>
              )}
            </div>
          )
        )
      }
    />
  );
}

/** Types with their own middle section; the rest use the plain question + media layout. */
const HAS_BODY: QuestionType[] = ["multipleChoice", "trueFalse", "order", "connection"];

/** The middle of the screen, by question type. */
function TypeBody({
  type,
  question,
  options,
  media,
}: {
  type: QuestionType;
  question: string;
  options: string[];
  media: Media | null;
}) {
  if (type === "multipleChoice") {
    return (
      <Stacked question={question} media={media}>
        <div className={`grid w-full gap-6 ${options.length > 4 ? "grid-cols-3" : "grid-cols-2"}`}>
          {options.map((o, i) => (
            <OptionCard key={i} letter={CHOICE_LETTERS[i]} text={o} index={i} />
          ))}
        </div>
      </Stacked>
    );
  }
  if (type === "trueFalse") {
    return (
      <Stacked question={question} media={media}>
        <div className="grid w-full grid-cols-2 gap-10">
          {["True", "False"].map((label, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.12 }}
              className={`flex h-[170px] items-center justify-center rounded-[20px] border-[3px] bg-panel/80 font-display text-[110px] font-black uppercase ${i === 0 ? "border-correct text-correct-soft" : "border-wrong text-wrong-soft"}`}
            >
              {label}
            </motion.div>
          ))}
        </div>
      </Stacked>
    );
  }
  if (type === "order") {
    return (
      <Stacked question={question} media={media}>
        <div className="flex w-full flex-col gap-4">
          <div className="grid w-full grid-cols-4 gap-6">
            {options.map((o, i) => (
              <OptionCard key={i} letter={CHOICE_LETTERS[i]} text={o} index={i} tall />
            ))}
          </div>
          <div className="text-center font-mono text-[22px] tracking-[0.24em] text-text-dim">ANSWER WITH THE LETTERS, E.G. “C · A · D · B”</div>
        </div>
      </Stacked>
    );
  }
  if (type === "connection") {
    return (
      <Stacked question={question} media={media}>
        <div className="grid w-full grid-cols-2 gap-6">
          {options.map((o, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.6, type: "spring", stiffness: 220, damping: 18 }}
              className="flex h-[150px] items-center justify-center rounded-[18px] border-2 border-cat-border bg-cat-bg px-8"
            >
              <FitText max={64} min={30} className="flex h-full w-full items-center justify-center text-center font-display font-black uppercase leading-[0.95] text-balance">
                {o}
              </FitText>
            </motion.div>
          ))}
        </div>
      </Stacked>
    );
  }
  return null;
}

/** Question text on top, then the type's options (with media to the side, if any). */
function Stacked({ question, media, children }: { question: string; media: Media | null; children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center gap-[60px]">
      {media && (
        <div className="flex shrink-0 justify-center">
          <MediaBlock media={media} width={460} />
        </div>
      )}
      <div className="flex h-full min-w-0 flex-1 flex-col justify-center gap-10">
        <FitText max={72} min={40} className="max-h-[300px] w-full font-semibold leading-[1.12] text-balance">
          <span>{question}</span>
        </FitText>
        {children}
      </div>
    </div>
  );
}

function OptionCard({ letter, text, index, tall }: { letter: string; text: string; index: number; tall?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 + index * 0.1 }}
      className={`flex items-center gap-6 rounded-[18px] border-2 border-cat-border bg-panel/85 px-7 ${tall ? "h-[200px] flex-col justify-center gap-3 text-center" : "h-[120px]"}`}
    >
      <span className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-gold font-display text-[42px] font-black text-bg">
        {letter}
      </span>
      <FitText max={48} min={24} step={2} className={`min-w-0 font-semibold leading-[1.1] ${tall ? "h-[100px] w-full text-balance" : "h-[96px] flex-1"} flex items-center ${tall ? "justify-center" : ""}`}>
        <span>{text}</span>
      </FitText>
    </motion.div>
  );
}

/** Shared by the regular question and the final-round question. */
export function QuestionLayout({
  background,
  heading,
  timer,
  question,
  media,
  body,
  footer,
}: {
  background: string;
  heading: React.ReactNode;
  timer: TimerView;
  question: string;
  media: Media | null;
  /** Replaces the plain question + media block when set. */
  body?: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className={`${background} flex h-full flex-col px-[100px] pt-[64px] pb-[64px]`}>
      <div className="flex items-start justify-between">
        <div>{heading}</div>
        <TimerRing timer={timer} />
      </div>

      <div className="flex min-h-0 flex-1 items-center gap-[72px] py-10">
        {body || (
          <>
            {media && (
              <div className="flex shrink-0 justify-center">
                <MediaBlock media={media} />
              </div>
            )}
            <FitText
              max={96}
              min={48}
              className={`flex h-full min-w-0 flex-1 items-center font-semibold leading-[1.12] text-balance ${media ? "text-left" : "justify-center text-center"}`}
            >
              <span>{question}</span>
            </FitText>
          </>
        )}
      </div>

      <div className="flex h-[60px] items-center justify-center">{footer}</div>
    </div>
  );
}
