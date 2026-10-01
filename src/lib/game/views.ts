/**
 * Projections of GameState for each surface.
 *
 * The TV renders ONLY a PublicView: it has no answer field until the answer is
 * revealed, and no secret final wagers. The host's phone gets a HostView, which
 * carries the answer and wagers. Keep display components typed against
 * PublicView so an answer can't leak onto the big screen by accident.
 */
import { getQuestion, lastActionLabel, maxBonusWager, timerRemaining } from "./engine";
import type { FinalJudgment, GameState, Media, MediaType, Team, TileRef, TileResult, Timer } from "./types";

export interface TimerView {
  durationMs: number;
  /** Remaining time at the moment the view was built. */
  remainingMs: number;
  running: boolean;
}

export interface TileView {
  value: number;
  played: boolean;
}

export interface BoardView {
  title: string;
  timerSeconds: number;
  categories: { name: string; tiles: TileView[] }[];
  teams: Team[];
  /** Team whose turn it is to pick (null in the lobby before teams exist). */
  turnTeamId: string | null;
}

interface TileInfo {
  tile: TileRef;
  category: string;
  value: number;
}

export type PublicPhase =
  | { kind: "lobby" }
  | { kind: "board" }
  | ({ kind: "bonusReveal"; teamId: string; maxWager: number } & TileInfo)
  | ({
      kind: "question";
      question: string;
      media: Media | null;
      pickerId: string;
      answeringId: string;
      stage: "picker" | "steal";
      isBonus: boolean;
      /** Points at stake: the tile value, or the wager on a bonus tile. */
      stake: number;
      results: TileResult[];
      timer: TimerView;
    } & TileInfo)
  | ({
      kind: "reveal";
      question: string;
      answer: string;
      media: Media | null;
      results: TileResult[];
    } & TileInfo)
  | {
      kind: "finalWager";
      category: string;
      /** Eligible teams only; teams not listed sit out. */
      status: Record<string, "locked" | "wagering">;
    }
  | {
      kind: "finalQuestion";
      category: string;
      question: string;
      media: Media | null;
      teamIds: string[];
      timer: TimerView;
    }
  | {
      kind: "finalReveal";
      category: string;
      question: string;
      answer: string;
      order: string[];
      /** Only teams already judged; their wager is public once revealed. */
      revealed: Record<string, FinalJudgment & { wager: number }>;
    }
  | { kind: "winner" };

export interface PublicView extends BoardView {
  phase: PublicPhase;
}

export type HostPhase =
  | { kind: "lobby" }
  | { kind: "board" }
  | ({ kind: "bonusReveal"; teamId: string; maxWager: number } & TileInfo)
  | ({
      kind: "question";
      question: string;
      answer: string;
      mediaType: MediaType | null;
      pickerId: string;
      answeringId: string;
      stage: "picker" | "steal";
      isBonus: boolean;
      stake: number;
      results: TileResult[];
      timer: TimerView;
    } & TileInfo)
  | ({ kind: "reveal"; question: string; answer: string; results: TileResult[] } & TileInfo)
  | {
      kind: "finalWager";
      category: string;
      wagers: Record<string, number | null>;
    }
  | {
      kind: "finalQuestion";
      category: string;
      question: string;
      answer: string;
      wagers: Record<string, number>;
      timer: TimerView;
    }
  | {
      kind: "finalReveal";
      category: string;
      question: string;
      answer: string;
      order: string[];
      wagers: Record<string, number>;
      judgments: Record<string, FinalJudgment>;
    }
  | { kind: "winner" };

export interface HostView extends BoardView {
  phase: HostPhase;
  lastAction: string | null;
}

function timerView(timer: Timer, now: number): TimerView {
  return {
    durationMs: timer.durationMs,
    remainingMs: timerRemaining(timer, now),
    running: timer.startedAt !== null && timerRemaining(timer, now) > 0,
  };
}

function boardView(state: GameState): BoardView {
  return {
    title: state.game.title,
    timerSeconds: state.game.timerSeconds,
    categories: state.game.categories.map((c, col) => ({
      name: c.name,
      tiles: c.questions.map((q, row) => ({ value: q.value, played: state.played[col][row] })),
    })),
    teams: state.teams,
    turnTeamId: state.teams[state.turn]?.id ?? null,
  };
}

function tileInfo(state: GameState, tile: TileRef): TileInfo {
  return {
    tile,
    category: state.game.categories[tile.col].name,
    value: getQuestion(state.game, tile).value,
  };
}

export function toPublicView(state: GameState, now: number = Date.now()): PublicView {
  const p = state.phase;
  const final = state.game.final;
  let phase: PublicPhase;

  switch (p.kind) {
    case "lobby":
    case "board":
    case "winner":
      phase = { kind: p.kind };
      break;
    case "bonusReveal": {
      const team = state.teams.find((t) => t.id === p.teamId);
      phase = {
        kind: "bonusReveal",
        ...tileInfo(state, p.tile),
        teamId: p.teamId,
        maxWager: maxBonusWager(team?.score ?? 0),
      };
      break;
    }
    case "question": {
      const q = getQuestion(state.game, p.tile);
      phase = {
        kind: "question",
        ...tileInfo(state, p.tile),
        question: q.question,
        media: q.media ?? null,
        pickerId: p.pickerId,
        answeringId: p.answeringId,
        stage: p.stage,
        isBonus: p.wager !== null,
        stake: p.wager ?? q.value,
        results: p.results,
        timer: timerView(p.timer, now),
      };
      break;
    }
    case "reveal": {
      const q = getQuestion(state.game, p.tile);
      phase = {
        kind: "reveal",
        ...tileInfo(state, p.tile),
        question: q.question,
        answer: q.answer,
        media: q.media ?? null,
        results: p.results,
      };
      break;
    }
    case "finalWager":
      phase = {
        kind: "finalWager",
        category: final.category,
        status: Object.fromEntries(
          Object.entries(p.wagers).map(([id, w]) => [id, w === null ? "wagering" : "locked"]),
        ),
      };
      break;
    case "finalQuestion":
      phase = {
        kind: "finalQuestion",
        category: final.category,
        question: final.question,
        media: final.media ?? null,
        teamIds: Object.keys(p.wagers),
        timer: timerView(p.timer, now),
      };
      break;
    case "finalReveal":
      phase = {
        kind: "finalReveal",
        category: final.category,
        question: final.question,
        answer: final.answer,
        order: p.order,
        revealed: Object.fromEntries(
          Object.entries(p.judgments).map(([id, j]) => [id, { ...j, wager: p.wagers[id] }]),
        ),
      };
      break;
  }

  return { ...boardView(state), phase };
}

export function toHostView(state: GameState, now: number = Date.now()): HostView {
  const p = state.phase;
  const final = state.game.final;
  let phase: HostPhase;

  switch (p.kind) {
    case "lobby":
    case "board":
    case "winner":
      phase = { kind: p.kind };
      break;
    case "bonusReveal": {
      const team = state.teams.find((t) => t.id === p.teamId);
      phase = {
        kind: "bonusReveal",
        ...tileInfo(state, p.tile),
        teamId: p.teamId,
        maxWager: maxBonusWager(team?.score ?? 0),
      };
      break;
    }
    case "question": {
      const q = getQuestion(state.game, p.tile);
      phase = {
        kind: "question",
        ...tileInfo(state, p.tile),
        question: q.question,
        answer: q.answer,
        mediaType: q.media?.type ?? null,
        pickerId: p.pickerId,
        answeringId: p.answeringId,
        stage: p.stage,
        isBonus: p.wager !== null,
        stake: p.wager ?? q.value,
        results: p.results,
        timer: timerView(p.timer, now),
      };
      break;
    }
    case "reveal": {
      const q = getQuestion(state.game, p.tile);
      phase = {
        kind: "reveal",
        ...tileInfo(state, p.tile),
        question: q.question,
        answer: q.answer,
        results: p.results,
      };
      break;
    }
    case "finalWager":
      phase = { kind: "finalWager", category: final.category, wagers: p.wagers };
      break;
    case "finalQuestion":
      phase = {
        kind: "finalQuestion",
        category: final.category,
        question: final.question,
        answer: final.answer,
        wagers: p.wagers,
        timer: timerView(p.timer, now),
      };
      break;
    case "finalReveal":
      phase = {
        kind: "finalReveal",
        category: final.category,
        question: final.question,
        answer: final.answer,
        order: p.order,
        wagers: p.wagers,
        judgments: p.judgments,
      };
      break;
  }

  return { ...boardView(state), phase, lastAction: lastActionLabel(state) };
}
