import {
  CATEGORY_COUNT,
  CONNECTION_CLUES,
  DEFAULT_TIMER_SECONDS,
  MAX_CHOICES,
  MAX_BONUS_TILES,
  MAX_TIMER_SECONDS,
  MIN_CHOICES,
  MIN_TIMER_SECONDS,
  ORDER_ITEMS,
  QUESTIONS_PER_CATEGORY,
  STANDARD_VALUES,
} from "./constants";
import { defaultPrompt, QUESTION_TYPE_ORDER, QUESTION_TYPES, questionType } from "./questions";
import type { Category, FinalQuestion, GameFile, Media, MediaType, Question, QuestionType } from "./types";

const MEDIA_TYPES: MediaType[] = ["image", "audio", "video"];
const isMediaType = (v: unknown): v is MediaType => MEDIA_TYPES.includes(v as MediaType);

export type ParseResult =
  | { ok: true; game: GameFile; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

/** Media above this (decoded) size gets a warning; the brief asks for ~500 KB. */
const MEDIA_WARN_BYTES = 600 * 1024;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Parses and validates the text of a game JSON file. */
export function parseGameJson(json: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { ok: false, errors: [`This file isn't valid JSON (${detail}).`], warnings: [] };
  }
  return validateGame(data);
}

/**
 * Validates an already-parsed game object and returns a normalized GameFile
 * (trimmed strings, defaults filled in, unknown keys dropped).
 */
export function validateGame(data: unknown): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObj(data)) {
    return { ok: false, errors: ["The file should contain a game object ({ … })."], warnings };
  }

  const title = text(data.title);
  if (!title) errors.push("The game needs a title.");

  let timerSeconds = DEFAULT_TIMER_SECONDS;
  if (data.timerSeconds !== undefined) {
    const t = data.timerSeconds;
    if (typeof t !== "number" || !Number.isInteger(t) || t < MIN_TIMER_SECONDS || t > MAX_TIMER_SECONDS) {
      errors.push(
        `timerSeconds must be a whole number from ${MIN_TIMER_SECONDS} to ${MAX_TIMER_SECONDS}.`,
      );
    } else {
      timerSeconds = t;
    }
  }

  const categories: Category[] = [];
  if (!Array.isArray(data.categories)) {
    errors.push(`The game needs a "categories" list with ${CATEGORY_COUNT} categories.`);
  } else {
    if (data.categories.length !== CATEGORY_COUNT) {
      errors.push(
        `The game needs exactly ${CATEGORY_COUNT} categories; this file has ${data.categories.length}.`,
      );
    }
    data.categories.slice(0, CATEGORY_COUNT).forEach((raw, ci) => {
      categories.push(validateCategory(raw, ci, errors, warnings));
    });
  }

  const bonusCount = categories.flatMap((c) => c.questions).filter((q) => q.bonus).length;
  if (bonusCount > MAX_BONUS_TILES) {
    errors.push(`A board can have at most ${MAX_BONUS_TILES} bonus tiles; this one has ${bonusCount}.`);
  } else if (bonusCount === 0 && categories.length === CATEGORY_COUNT) {
    warnings.push("There are no bonus tiles. Mark 1–2 tiles as bonus for a surprise.");
  }

  let final: FinalQuestion | null = null;
  if (!isObj(data.final)) {
    errors.push("The final round question is missing.");
  } else {
    const where = "Final round";
    const category = text(data.final.category);
    const question = text(data.final.question);
    const answer = text(data.final.answer);
    if (!category) errors.push(`${where}: the category is missing.`);
    if (!question) errors.push(`${where}: the question is missing.`);
    if (!answer) errors.push(`${where}: the answer is missing.`);
    const media = validateMedia(data.final.media, where, errors, warnings);
    final = { category, question, answer, ...(media && { media }) };
  }

  if (errors.length > 0 || !final) return { ok: false, errors, warnings };
  return { ok: true, game: { title, timerSeconds, categories, final }, warnings };
}

function validateCategory(raw: unknown, ci: number, errors: string[], warnings: string[]): Category {
  const label = `Category ${ci + 1}`;
  if (!isObj(raw)) {
    errors.push(`${label} should be an object with a name and questions.`);
    return { name: "", questions: [] };
  }
  const name = text(raw.name);
  if (!name) errors.push(`${label} needs a name.`);
  const where = name ? `${label} ("${name}")` : label;

  const questions: Question[] = [];
  if (!Array.isArray(raw.questions)) {
    errors.push(`${where} needs a "questions" list with ${QUESTIONS_PER_CATEGORY} questions.`);
  } else {
    if (raw.questions.length !== QUESTIONS_PER_CATEGORY) {
      errors.push(
        `${where} needs exactly ${QUESTIONS_PER_CATEGORY} questions; it has ${raw.questions.length}.`,
      );
    }
    raw.questions.slice(0, QUESTIONS_PER_CATEGORY).forEach((q, qi) => {
      questions.push(validateQuestion(q, `${where}, question ${qi + 1}`, qi, errors, warnings));
    });
  }
  return { name, questions };
}

function validateQuestion(
  raw: unknown,
  where: string,
  qi: number,
  errors: string[],
  warnings: string[],
): Question {
  const standard: number = STANDARD_VALUES[qi] ?? (qi + 1) * 100;
  if (!isObj(raw)) {
    errors.push(`${where} should be an object with a question and an answer.`);
    return { value: standard, question: "", answer: "", bonus: false };
  }

  let value = standard;
  if (raw.value === undefined) {
    warnings.push(`${where} has no value; using ${standard}.`);
  } else if (typeof raw.value !== "number" || !Number.isInteger(raw.value) || raw.value <= 0) {
    errors.push(`${where}: value must be a positive whole number.`);
  } else {
    value = raw.value;
    if (value !== standard) warnings.push(`${where} is worth ${value}; the standard value is ${standard}.`);
  }

  let type: QuestionType = "standard";
  if (raw.type !== undefined) {
    if (typeof raw.type === "string" && raw.type in QUESTION_TYPES) type = raw.type as QuestionType;
    else errors.push(`${where}: type must be one of ${QUESTION_TYPE_ORDER.join(", ")}.`);
  }
  const info = QUESTION_TYPES[type];

  const question = text(raw.question);
  let answer = text(raw.answer);
  // Order It and Connection have a sensible default prompt.
  if (!question && !defaultPrompt(type)) errors.push(`${where}: the question is missing.`);

  if (raw.bonus !== undefined && typeof raw.bonus !== "boolean") {
    errors.push(`${where}: bonus must be true or false.`);
  }
  const bonus = raw.bonus === true;
  const media = validateMedia(raw.media, where, errors, warnings);

  let options: string[] | undefined;
  let target: number | undefined;
  const optionList = (label: string, min: number, max: number): string[] => {
    if (!Array.isArray(raw.options)) {
      errors.push(`${where}: add ${min === max ? min : `${min}–${max}`} ${label}.`);
      return [];
    }
    const list = raw.options.map(text);
    if (list.length < min || list.length > max) {
      errors.push(`${where}: needs ${min === max ? `exactly ${min}` : `${min}–${max}`} ${label}; it has ${list.length}.`);
    }
    if (list.some((o) => !o)) errors.push(`${where}: one of the ${label} is blank.`);
    return list;
  };

  switch (type) {
    case "multipleChoice": {
      options = optionList("choices", MIN_CHOICES, MAX_CHOICES);
      const match = options.find((o) => o.toLowerCase() === answer.toLowerCase());
      if (answer && options.length > 0 && !match) errors.push(`${where}: the answer must be one of the choices.`);
      if (match) answer = match;
      break;
    }
    case "trueFalse":
      if (/^(true|t)$/i.test(answer)) answer = "True";
      else if (/^(false|f)$/i.test(answer)) answer = "False";
      else if (answer) errors.push(`${where}: the answer must be True or False.`);
      break;
    case "closest": {
      const t = raw.target;
      if (typeof t !== "number" || !Number.isFinite(t)) {
        errors.push(`${where}: Closest Wins needs a target number.`);
      } else {
        target = t;
        if (!answer) answer = t.toLocaleString("en-US");
      }
      if (bonus) errors.push(`${where}: a Closest Wins tile can't be a bonus tile (every team answers).`);
      break;
    }
    case "order":
      options = optionList("items", ORDER_ITEMS, ORDER_ITEMS);
      if (!answer && options.every(Boolean)) answer = options.join(" → ");
      break;
    case "connection":
      options = optionList("clues", CONNECTION_CLUES, CONNECTION_CLUES);
      break;
    case "wager":
      if (bonus) errors.push(`${where}: a Wager tile already asks for a wager, so it can't also be a bonus tile.`);
      break;
  }

  if (!answer) errors.push(`${where}: the answer is missing.`);
  if (info.media && media?.type !== info.media) {
    errors.push(`${where}: a ${info.label} question needs ${info.media === "image" ? "an image" : `a${info.media === "audio" ? "n audio clip" : " video"}`}.`);
  }

  return {
    value,
    ...(type !== "standard" && { type }),
    question,
    answer,
    ...(options && { options }),
    ...(target !== undefined && { target }),
    ...(media && { media }),
    bonus,
  };
}

function validateMedia(raw: unknown, where: string, errors: string[], warnings: string[]): Media | null {
  if (raw === undefined || raw === null) return null;
  if (!isObj(raw)) {
    errors.push(`${where}: media should be an object with a type and src.`);
    return null;
  }
  const type = raw.type;
  const src = text(raw.src);
  if (!isMediaType(type)) {
    errors.push(`${where}: media type must be "image", "audio" or "video".`);
    return null;
  }
  if (!src) {
    errors.push(`${where}: media has no src.`);
    return null;
  }
  if (src.startsWith("data:")) {
    const mime = src.slice(5, src.indexOf(";") > 0 ? src.indexOf(";") : undefined);
    if (!mime.startsWith(`${type}/`)) {
      warnings.push(`${where}: media is marked as ${type} but contains ${mime || "unknown data"}.`);
    }
    const bytes = Math.floor((src.length - src.indexOf(",") - 1) * 0.75);
    if (bytes > MEDIA_WARN_BYTES) {
      warnings.push(`${where}: media is about ${Math.round(bytes / 1024)} KB; aim for under 500 KB.`);
    }
  } else if (!/^https?:\/\//i.test(src)) {
    errors.push(`${where}: media src must be a data: URI or an http(s) URL.`);
    return null;
  }
  return { type, src };
}

/** Serializes a game to the shareable JSON format (stable key order). */
export function exportGame(game: GameFile): string {
  const media = (m?: Media) => (m ? { media: { type: m.type, src: m.src } } : {});
  const out = {
    title: game.title,
    timerSeconds: game.timerSeconds,
    categories: game.categories.map((c) => ({
      name: c.name,
      questions: c.questions.map((q) => ({
        value: q.value,
        ...(questionType(q) !== "standard" && { type: q.type }),
        question: q.question,
        answer: q.answer,
        ...(q.options && { options: q.options }),
        ...(q.target !== undefined && { target: q.target }),
        ...media(q.media),
        bonus: q.bonus,
      })),
    })),
    final: {
      category: game.final.category,
      question: game.final.question,
      answer: game.final.answer,
      ...media(game.final.media),
    },
  };
  return JSON.stringify(out, null, 2) + "\n";
}

/** A blank 6×5 game with standard values, for the editor. */
export function createEmptyGame(title = "Untitled game"): GameFile {
  return {
    title,
    timerSeconds: DEFAULT_TIMER_SECONDS,
    categories: Array.from({ length: CATEGORY_COUNT }, () => ({
      name: "",
      questions: STANDARD_VALUES.map((value) => ({ value, question: "", answer: "", bonus: false })),
    })),
    final: { category: "", question: "", answer: "" },
  };
}

/**
 * Lenient import for the editor: turns any parsed JSON into a full 6×5 draft,
 * keeping whatever is usable and leaving the rest blank. Never throws.
 */
export function draftFromUnknown(data: unknown): GameFile {
  const base = createEmptyGame();
  if (!isObj(data)) return base;

  const t = data.timerSeconds;
  const timerSeconds =
    typeof t === "number" && Number.isInteger(t) && t >= MIN_TIMER_SECONDS && t <= MAX_TIMER_SECONDS
      ? t
      : DEFAULT_TIMER_SECONDS;
  const rawCats = Array.isArray(data.categories) ? data.categories : [];

  const categories = base.categories.map((blank, ci): Category => {
    const rc = rawCats[ci];
    if (!isObj(rc)) return blank;
    const rawQs = Array.isArray(rc.questions) ? rc.questions : [];
    return {
      name: text(rc.name),
      questions: blank.questions.map((bq, qi): Question => {
        const rq = rawQs[qi];
        if (!isObj(rq)) return bq;
        const v = rq.value;
        const media = looseMedia(rq.media);
        const type = typeof rq.type === "string" && rq.type in QUESTION_TYPES ? (rq.type as QuestionType) : undefined;
        const options = Array.isArray(rq.options) ? rq.options.map(text) : undefined;
        const target = typeof rq.target === "number" && Number.isFinite(rq.target) ? rq.target : undefined;
        return {
          value: typeof v === "number" && Number.isInteger(v) && v > 0 ? v : bq.value,
          ...(type && type !== "standard" && { type }),
          question: text(rq.question),
          answer: text(rq.answer),
          ...(options && { options }),
          ...(target !== undefined && { target }),
          ...(media && { media }),
          bonus: rq.bonus === true,
        };
      }),
    };
  });

  const rf = isObj(data.final) ? data.final : {};
  const finalMedia = looseMedia(rf.media);
  return {
    title: text(data.title) || base.title,
    timerSeconds,
    categories,
    final: {
      category: text(rf.category),
      question: text(rf.question),
      answer: text(rf.answer),
      ...(finalMedia && { media: finalMedia }),
    },
  };
}

function looseMedia(raw: unknown): Media | null {
  if (!isObj(raw)) return null;
  const src = text(raw.src);
  if (!isMediaType(raw.type) || !src) return null;
  return { type: raw.type, src };
}

/** What's stopping one tile from being playable (the first problem), or null. */
export function questionProblem(q: Question): string | null {
  const errors: string[] = [];
  validateQuestion(q, "", 0, errors, []);
  if (errors.length === 0) return null;
  return errors[0].replace(/^:\s*/, "").replace(/^./, (c) => c.toUpperCase());
}

export const isQuestionWritten = (q: Question) => questionProblem(q) === null;

/** Editor status line numbers. */
export function gameProgress(game: GameFile) {
  const questions = game.categories.flatMap((c) => c.questions);
  const f = game.final;
  return {
    written: questions.filter(isQuestionWritten).length,
    total: questions.length,
    bonus: questions.filter((q) => q.bonus).length,
    namedCategories: game.categories.filter((c) => c.name.trim() !== "").length,
    finalReady: f.category.trim() !== "" && f.question.trim() !== "" && f.answer.trim() !== "",
  };
}
