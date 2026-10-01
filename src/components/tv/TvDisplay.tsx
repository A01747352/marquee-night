"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { PublicView } from "@/lib/game";
import { Board } from "./Board";
import { BonusScreen } from "./BonusScreen";
import { FinalQuestionScreen, FinalRevealScreen, FinalWagerScreen } from "./FinalScreens";
import { Lobby } from "./Lobby";
import { QuestionScreen } from "./QuestionScreen";
import { RevealScreen } from "./RevealScreen";
import { WinnerScreen } from "./WinnerScreen";

/**
 * Everything the room sees. Takes a PublicView only, which never carries an
 * unrevealed answer, so nothing here can leak one onto the big screen.
 */
export function TvDisplay({
  view,
  roomCode,
  joinUrl,
  hostConnected,
  localOnly,
  onPick,
}: {
  view: PublicView;
  roomCode: string;
  joinUrl: string;
  hostConnected: boolean;
  localOnly: boolean;
  onPick?: (col: number, row: number) => void;
}) {
  const p = view.phase;
  // Steal attempts re-render in place; everything else crossfades.
  const key = "tile" in p ? `${p.kind}-${p.tile.col}-${p.tile.row}` : p.kind;

  let screen: React.ReactNode;
  switch (p.kind) {
    case "lobby":
      screen = (
        <Lobby
          view={view}
          roomCode={roomCode}
          joinUrl={joinUrl}
          hostConnected={hostConnected}
          localOnly={localOnly}
        />
      );
      break;
    case "board":
      screen = <Board view={view} roomCode={roomCode} hostConnected={hostConnected} onPick={onPick} />;
      break;
    case "bonusReveal":
      screen = <BonusScreen phase={p} teams={view.teams} />;
      break;
    case "question":
      screen = <QuestionScreen phase={p} teams={view.teams} />;
      break;
    case "reveal":
      screen = <RevealScreen phase={p} teams={view.teams} />;
      break;
    case "finalWager":
      screen = <FinalWagerScreen phase={p} teams={view.teams} />;
      break;
    case "finalQuestion":
      screen = <FinalQuestionScreen phase={p} teams={view.teams} />;
      break;
    case "finalReveal":
      screen = <FinalRevealScreen phase={p} teams={view.teams} />;
      break;
    case "winner":
      screen = <WinnerScreen view={view} />;
      break;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        {screen}
      </motion.div>
    </AnimatePresence>
  );
}
