import type { MediaType, Question, QuestionType } from "./types";

export interface QuestionTypeInfo {
  label: string;
  /** Short tag for the TV and phone, e.g. "MULTIPLE CHOICE". */
  tag: string;
  /** One line for the editor. */
  hint: string;
  /** Media this type requires. */
  media?: MediaType;
}

export const QUESTION_TYPES: Record<QuestionType, QuestionTypeInfo> = {
  standard: { label: "Normal", tag: "", hint: "Answer the question." },
  multipleChoice: { label: "Multiple choice", tag: "Multiple choice", hint: "Pick from 2–6 choices. Wrong answers can be stolen." },
  trueFalse: { label: "True / False", tag: "True or false", hint: "No steal: the other answer would be obvious." },
  picture: { label: "Picture", tag: "Picture round", hint: "Identify what's in the image.", media: "image" },
  audio: { label: "Audio", tag: "Listen", hint: "Identify the song, person or sound.", media: "audio" },
  video: { label: "Video", tag: "Watch", hint: "A short clip to identify.", media: "video" },
  closest: { label: "Closest wins", tag: "Closest wins", hint: "Every team guesses a number; the closest scores. No penalty." },
  order: { label: "Order it", tag: "Order it", hint: "Put 4 things in order. Enter them in the right order; the TV shuffles them." },
  connection: { label: "Connection", tag: "Connection", hint: "What do 4 clues have in common?" },
  wager: { label: "Wager", tag: "Wager", hint: "The picker risks 0 to their score (or 500) before seeing it. No steal." },
};

export const QUESTION_TYPE_ORDER = Object.keys(QUESTION_TYPES) as QuestionType[];

export const questionType = (q: Pick<Question, "type">): QuestionType => q.type ?? "standard";

/** What the TV says above the clues when the author left the question blank. */
export function defaultPrompt(type: QuestionType): string {
  if (type === "order") return "Put these in order, earliest first.";
  if (type === "connection") return "What do these four have in common?";
  return "";
}

export const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

/**
 * Deterministic shuffle for Order It, seeded by where the tile is so the TV
 * and the phone agree (and a refresh doesn't reshuffle). Never returns the
 * correct order unchanged.
 */
export function shuffledOrder(items: string[], seed: number): number[] {
  const idx = items.map((_, i) => i);
  if (idx.length < 2) return idx;
  const rand = seededRandom(seed);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  if (idx.every((v, i) => v === i)) idx.push(idx.shift()!);
  return idx;
}

/** Park–Miller PRNG: same seed, same sequence. */
export function seededRandom(seed: number): () => number {
  let s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** The last row of a category is the "deep cut": the hardest question. */
export const isDeepCutRow = (row: number, rows: number) => rows > 1 && row === rows - 1;
