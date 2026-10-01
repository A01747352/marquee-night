"use client";

import { useEffect, useState } from "react";
import { FinalQuestionScreen } from "@/components/tv/FinalScreens";
import { QuestionScreen } from "@/components/tv/QuestionScreen";
import { RevealScreen } from "@/components/tv/RevealScreen";
import { Stage } from "@/components/tv/Stage";
import type { GameFile, Team, TileRef } from "@/lib/game";

const PREVIEW_TEAM: Team = { id: "preview", name: "Team", color: "#35d6ff", score: 0 };

/** Full-screen look at a tile (or the final) exactly as the TV will render it. */
export function PreviewModal({
  game,
  tile,
  onClose,
}: {
  game: GameFile;
  /** null = the final round question. */
  tile: TileRef | null;
  onClose: () => void;
}) {
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        setShowAnswer((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const timer = { durationMs: game.timerSeconds * 1000, remainingMs: game.timerSeconds * 1000, running: false };
  let screen: React.ReactNode;

  if (tile) {
    const category = game.categories[tile.col].name || `Category ${tile.col + 1}`;
    const q = game.categories[tile.col].questions[tile.row];
    const common = { tile, category, value: q.value, question: q.question || "(no question yet)", media: q.media ?? null };
    screen = showAnswer ? (
      <RevealScreen phase={{ kind: "reveal", ...common, answer: q.answer || "(no answer yet)", results: [] }} teams={[]} />
    ) : (
      <QuestionScreen
        phase={{
          kind: "question",
          ...common,
          pickerId: PREVIEW_TEAM.id,
          answeringId: PREVIEW_TEAM.id,
          stage: "picker",
          isBonus: false,
          stake: q.value,
          results: [],
          timer,
        }}
        teams={[PREVIEW_TEAM]}
      />
    );
  } else {
    const f = game.final;
    screen = (
      <FinalQuestionScreen
        phase={{
          kind: "finalQuestion",
          category: f.category || "Final category",
          question: f.question || "(no question yet)",
          media: f.media ?? null,
          teamIds: [PREVIEW_TEAM.id],
          timer,
        }}
        teams={[PREVIEW_TEAM]}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="TV preview">
      <Stage>{screen}</Stage>
      <div className="fixed top-4 right-4 z-[60] flex gap-2">
        {tile && (
          <button
            type="button"
            onClick={() => setShowAnswer((s) => !s)}
            className="rounded-xl bg-panel px-4 py-2.5 font-semibold ring-2 ring-panel-border hover:ring-cat-border"
          >
            {showAnswer ? "Show question" : "Show answer"}
          </button>
        )}
        <button type="button" onClick={onClose} className="rounded-xl bg-gold px-4 py-2.5 font-semibold text-bg">
          Close · Esc
        </button>
      </div>
    </div>
  );
}
