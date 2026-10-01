"use client";

import type { Media, PublicPhase, Team, TimerView } from "@/lib/game";
import { FitText, MediaBlock, TeamDot, TimerRing } from "./parts";

type QuestionPhase = Extract<PublicPhase, { kind: "question" }>;

export function QuestionScreen({ phase, teams }: { phase: QuestionPhase; teams: Team[] }) {
  const answering = teams.find((t) => t.id === phase.answeringId);
  return (
    <QuestionLayout
      background="bg-question-glow"
      heading={
        <>
          <div className="font-display text-[48px] font-extrabold uppercase leading-none tracking-[0.08em]">
            {phase.category}
          </div>
          <div className="mt-2 font-display text-[64px] font-black leading-none text-glow-gold">
            {phase.isBonus ? `BONUS · ${phase.stake}` : phase.value}
          </div>
        </>
      }
      timer={phase.timer}
      question={phase.question}
      media={phase.media}
      footer={
        answering && (
          <div className="flex items-center gap-5 text-[36px] font-semibold">
            <TeamDot color={answering.color} size={26} />
            <span>{answering.name}</span>
            <span className="text-text-muted">{phase.stage === "steal" ? "· steal attempt" : "answering"}</span>
            {phase.stage === "steal" && (
              <span className="ml-3 rounded-full border-2 border-steal px-5 py-1 font-mono text-[18px] tracking-[0.2em] text-steal">
                RISK-FREE
              </span>
            )}
          </div>
        )
      }
    />
  );
}

/** Shared by the regular question and the final-round question. */
export function QuestionLayout({
  background,
  heading,
  timer,
  question,
  media,
  footer,
}: {
  background: string;
  heading: React.ReactNode;
  timer: TimerView;
  question: string;
  media: Media | null;
  footer: React.ReactNode;
}) {
  return (
    <div className={`${background} flex h-full flex-col px-[100px] pt-[64px] pb-[64px]`}>
      <div className="flex items-start justify-between">
        <div>{heading}</div>
        <TimerRing timer={timer} />
      </div>

      <div className="flex min-h-0 flex-1 items-center gap-[72px] py-10">
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
      </div>

      <div className="flex h-[60px] items-center justify-center">{footer}</div>
    </div>
  );
}
