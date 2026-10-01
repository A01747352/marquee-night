// ---------- Game file (the JSON format from the product brief) ----------

export type MediaType = "image" | "audio";

export interface Media {
  type: MediaType;
  /** A data: URI (default, works offline) or an http(s) URL. */
  src: string;
}

export interface Question {
  value: number;
  question: string;
  answer: string;
  media?: Media;
  bonus: boolean;
}

export interface Category {
  name: string;
  questions: Question[];
}

export interface FinalQuestion {
  category: string;
  question: string;
  answer: string;
  media?: Media;
}

export interface GameFile {
  title: string;
  timerSeconds: number;
  categories: Category[];
  final: FinalQuestion;
}

// ---------- Runtime state (owned by the TV) ----------

export interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
}

/** Column (category index) and row (question index) on the board. */
export interface TileRef {
  col: number;
  row: number;
}

export interface Timer {
  durationMs: number;
  /** Time left as of `startedAt` (or now, if paused). */
  remainingMs: number;
  /** Epoch ms when the timer was last resumed; null while paused/stopped. */
  startedAt: number | null;
}

export interface TileResult {
  teamId: string;
  delta: number;
  steal: boolean;
}

export type FinalJudgment = { correct: boolean; answer: string };

export type Phase =
  | { kind: "lobby" }
  | { kind: "board" }
  | { kind: "bonusReveal"; tile: TileRef; teamId: string }
  | {
      kind: "question";
      tile: TileRef;
      /** Team whose turn it was; they picked the tile. */
      pickerId: string;
      /** Team currently answering: the picker, or the stealer. */
      answeringId: string;
      stage: "picker" | "steal";
      /** Set on bonus tiles: the points at stake replace the tile value. */
      wager: number | null;
      results: TileResult[];
      timer: Timer;
    }
  | { kind: "reveal"; tile: TileRef; results: TileResult[] }
  | {
      kind: "finalWager";
      /** Wager per eligible team; null = not locked in yet. */
      wagers: Record<string, number | null>;
    }
  | { kind: "finalQuestion"; wagers: Record<string, number>; timer: Timer }
  | {
      kind: "finalReveal";
      wagers: Record<string, number>;
      /** Reveal order (eligible teams, lowest score first for drama). */
      order: string[];
      judgments: Record<string, FinalJudgment>;
    }
  | { kind: "winner" };

export type PhaseKind = Phase["kind"];

export interface HistoryEntry {
  label: string;
  snapshot: Omit<GameState, "history">;
}

export interface GameState {
  game: GameFile;
  teams: Team[];
  /** Index into `teams` of the team whose turn it is to pick. */
  turn: number;
  /** played[col][row] */
  played: boolean[][];
  phase: Phase;
  history: HistoryEntry[];
}

// ---------- Actions (sent by the host remote) ----------

export type Action =
  | { type: "setTeams"; teams: { name: string; color: string }[] }
  | { type: "startGame" }
  | { type: "pickTile"; col: number; row: number }
  | { type: "lockBonusWager"; amount: number }
  | { type: "correct" }
  | { type: "wrong" }
  | { type: "revealAnswer" }
  | { type: "continue" }
  | { type: "timerStart" }
  | { type: "timerPause" }
  | { type: "timerSkip" }
  | { type: "setScore"; teamId: string; score: number }
  | { type: "adjustScore"; teamId: string; delta: number }
  | { type: "goToFinal" }
  | { type: "lockFinalWager"; teamId: string; amount: number }
  | { type: "showFinalQuestion" }
  | { type: "startFinalReveal" }
  | { type: "judgeFinal"; teamId: string; correct: boolean; answer?: string }
  | { type: "showWinner" }
  | { type: "undo" };
