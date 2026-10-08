/**
 * Projections of GameState for each surface.
 *
 * The TV renders ONLY a PublicView: it has no answer field until the answer is
 * revealed, and no secret final wagers. The host's phone gets a HostView, which
 * carries the answer and wagers. Players' phones get a PlayerView, which is
 * even smaller (no question text, no media). Keep display components typed
 * against PublicView so an answer can't leak onto the big screen by accident.
 */
import { getQuestion, lastActionLabel, maxBonusWager, timerRemaining } from "./engine";
import { CHOICE_LETTERS, defaultPrompt, isDeepCutRow, questionType, shuffledOrder } from "./questions";
import type {
  FinalJudgment,
  GameState,
  Media,
  MediaType,
  Player,
  Question,
  QuestionType,
  Team,
  TileRef,
  TileResult,
  Timer,
} from "./types";

export interface TimerView {
  durationMs: number;
  /** Remaining time at the moment the view was built. */
  remainingMs: number;
  running: boolean;
}

export interface TileView {
  value: number;
  played: boolean;
  /** The hardest row: shown with a darker, scarier tile. */
  deepCut: boolean;
}

export interface BoardView {
  title: string;
  timerSeconds: number;
  categories: { name: string; tiles: TileView[] }[];
  teams: Team[];
  players: Player[];
  /** Team whose turn it is to pick (null in the lobby before teams exist). */
  turnTeamId: string | null;
}

interface TileInfo {
  tile: TileRef;
  category: string;
  value: number;
  deepCut: boolean;
}

/** What the question shows besides its text. Never includes the answer. */
interface QuestionBody {
  type: QuestionType;
  /** The question text, or the type's default prompt when the author left it blank. */
  question: string;
  /**
   * multipleChoice: the choices; order: the items, shuffled; connection: the clues.
   * Shown with letters A, B, C…
   */
  options: string[];
}

export type QuestionStage = "picker" | "steal" | "all";

export type PublicPhase =
  | { kind: "lobby" }
  | { kind: "board" }
  | ({ kind: "bonusReveal"; teamId: string; maxWager: number; reason: "bonus" | "wager" } & TileInfo)
  | ({
      kind: "question";
      media: Media | null;
      pickerId: string;
      answeringId: string;
      stage: QuestionStage;
      isBonus: boolean;
      /** Points at stake: the tile value, or the wager on a bonus/wager tile. */
      stake: number;
      results: TileResult[];
      timer: TimerView;
    } & TileInfo &
      QuestionBody)
  | ({
      kind: "reveal";
      answer: string;
      /** order: the items in the right order, each with the letter it had on screen. */
      answerLines: string[] | null;
      media: Media | null;
      results: TileResult[];
    } & TileInfo &
      QuestionBody)
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
  | ({ kind: "bonusReveal"; teamId: string; maxWager: number; reason: "bonus" | "wager" } & TileInfo)
  | ({
      kind: "question";
      answer: string;
      answerLines: string[] | null;
      /** closest: the number to beat. */
      target: number | null;
      mediaType: MediaType | null;
      pickerId: string;
      answeringId: string;
      stage: QuestionStage;
      isBonus: boolean;
      stake: number;
      results: TileResult[];
      timer: TimerView;
    } & TileInfo &
      QuestionBody)
  | ({
      kind: "reveal";
      answer: string;
      answerLines: string[] | null;
      results: TileResult[];
    } & TileInfo &
      QuestionBody)
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

/** What a player's phone shows: their team, the scores, and what's going on. */
export interface PlayerView {
  title: string;
  teams: Team[];
  players: Player[];
  turnTeamId: string | null;
  phase: {
    kind: GameState["phase"]["kind"];
    category?: string;
    value?: number;
    /** Team answering right now (question phase). */
    answeringId?: string;
    stage?: QuestionStage;
  };
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
      tiles: c.questions.map((q, row) => ({
        value: q.value,
        played: state.played[col][row],
        deepCut: isDeepCutRow(row, c.questions.length),
      })),
    })),
    teams: state.teams,
    players: state.players ?? [],
    turnTeamId: state.teams[state.turn]?.id ?? null,
  };
}

function tileInfo(state: GameState, tile: TileRef): TileInfo {
  const cat = state.game.categories[tile.col];
  return {
    tile,
    category: cat.name,
    value: getQuestion(state.game, tile).value,
    deepCut: isDeepCutRow(tile.row, cat.questions.length),
  };
}

/** Same seed for a tile everywhere, so the TV and the phone show the same order. */
const tileSeed = (tile: TileRef) => (tile.col + 1) * 7919 + (tile.row + 1) * 104729;

/** Order It items as shown, plus where each one is in the shuffled list. */
function orderLayout(q: Question, tile: TileRef) {
  const items = q.options ?? [];
  const perm = shuffledOrder(items, tileSeed(tile));
  return { shown: perm.map((i) => items[i]), positionOf: (i: number) => perm.indexOf(i) };
}

function questionBody(q: Question, tile: TileRef): QuestionBody {
  const type = questionType(q);
  const options =
    type === "order"
      ? orderLayout(q, tile).shown
      : type === "multipleChoice" || type === "connection"
        ? (q.options ?? [])
        : [];
  return { type, question: q.question || defaultPrompt(type), options };
}

function answerLines(q: Question, tile: TileRef): string[] | null {
  if (questionType(q) !== "order") return null;
  const { positionOf } = orderLayout(q, tile);
  return (q.options ?? []).map((item, i) => `${CHOICE_LETTERS[positionOf(i)]} · ${item}`);
}

function wagerReason(q: Question): "bonus" | "wager" {
  return q.bonus ? "bonus" : "wager";
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
        reason: wagerReason(getQuestion(state.game, p.tile)),
      };
      break;
    }
    case "question": {
      const q = getQuestion(state.game, p.tile);
      phase = {
        kind: "question",
        ...tileInfo(state, p.tile),
        ...questionBody(q, p.tile),
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
        ...questionBody(q, p.tile),
        answer: q.answer,
        answerLines: answerLines(q, p.tile),
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
        reason: wagerReason(getQuestion(state.game, p.tile)),
      };
      break;
    }
    case "question": {
      const q = getQuestion(state.game, p.tile);
      phase = {
        kind: "question",
        ...tileInfo(state, p.tile),
        ...questionBody(q, p.tile),
        answer: q.answer,
        answerLines: answerLines(q, p.tile),
        target: q.target ?? null,
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
        ...questionBody(q, p.tile),
        answer: q.answer,
        answerLines: answerLines(q, p.tile),
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

export function toPlayerView(state: GameState): PlayerView {
  const p = state.phase;
  const phase: PlayerView["phase"] = { kind: p.kind };
  if ("tile" in p) {
    const info = tileInfo(state, p.tile);
    phase.category = info.category;
    phase.value = info.value;
  }
  if (p.kind === "question") {
    phase.answeringId = p.answeringId;
    phase.stage = p.stage;
  }
  return {
    title: state.game.title,
    teams: state.teams,
    players: state.players ?? [],
    turnTeamId: state.teams[state.turn]?.id ?? null,
    phase,
  };
}

