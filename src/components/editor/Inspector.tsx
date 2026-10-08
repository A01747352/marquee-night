"use client";

import {
  CHOICE_LETTERS,
  CONNECTION_CLUES,
  defaultPrompt,
  MAX_BONUS_TILES,
  MAX_CHOICES,
  MIN_CHOICES,
  ORDER_ITEMS,
  QUESTION_TYPE_ORDER,
  QUESTION_TYPES,
  questionProblem,
  questionType,
  type FinalQuestion,
  type Question,
  type QuestionType,
} from "@/lib/game";
import { MediaDrop } from "./MediaDrop";

const field =
  "w-full rounded-lg bg-bg px-3 py-2.5 text-[15px] outline-none ring-1 ring-panel-border placeholder:text-text-dim/60 focus:ring-2 focus:ring-cat-border";

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
      {children}
    </label>
  );
}

/** Right column: edit the selected tile. */
export function TileInspector({
  tileKey,
  category,
  question,
  bonusCount,
  onChange,
  onPreview,
  onSave,
  saveLabel,
}: {
  tileKey: string;
  category: string;
  question: Question;
  bonusCount: number;
  onChange: (patch: Partial<Question>) => void;
  onPreview: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  const bonusFull = !question.bonus && bonusCount >= MAX_BONUS_TILES;
  const type = questionType(question);
  const info = QUESTION_TYPES[type];
  // Wager tiles already ask for a wager; Closest Wins is answered by everyone.
  const bonusBlocked = type === "wager" || type === "closest";
  const problem = questionProblem(question);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">Selected tile</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="truncate font-display text-[26px] font-black uppercase tracking-[0.04em]">
            {category.trim() || "Untitled category"}
          </span>
          <span className="font-display text-[26px] font-black text-gold">{question.value}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="q-type">Type</Label>
        <select
          id="q-type"
          value={type}
          onChange={(e) => onChange(switchType(question, e.target.value as QuestionType))}
          className={field}
        >
          {QUESTION_TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPES[t].label}
            </option>
          ))}
        </select>
        <p className="text-[12px] text-text-muted">{info.hint}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="q-text">Question{defaultPrompt(type) && " (optional)"}</Label>
        <textarea
          id="q-text"
          value={question.question}
          onChange={(e) => onChange({ question: e.target.value })}
          rows={3}
          placeholder={defaultPrompt(type) || "What do you want to ask?"}
          className={`${field} resize-y leading-snug`}
        />
      </div>

      <TypeFields question={question} type={type} onChange={onChange} />

      {problem && (question.question.trim() || question.answer.trim()) && (
        <p className="text-[12px] font-semibold text-wrong-soft">{problem}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Media{info.media && ` (needs ${info.media})`}</Label>
        <MediaDrop key={tileKey} media={question.media} onChange={(media) => onChange({ media })} />
      </div>

      <div className="flex items-center justify-between rounded-[12px] bg-bg px-4 py-3 ring-1 ring-panel-border">
        <div>
          <div className="text-[15px] font-semibold">Bonus tile</div>
          <div className="text-[12px] text-text-muted">
            {bonusBlocked
              ? `Not available on ${info.label} tiles`
              : bonusFull
                ? `Already ${MAX_BONUS_TILES} bonus tiles on this board`
                : "Hidden until picked; team wagers; no steal"}
          </div>
        </div>
        <Toggle
          checked={question.bonus}
          disabled={bonusFull || (bonusBlocked && !question.bonus)}
          label="Bonus tile"
          onChange={(bonus) => onChange({ bonus })}
        />
      </div>

      <InspectorButtons onPreview={onPreview} onSave={onSave} saveLabel={saveLabel} />
    </div>
  );
}

/** Fields that depend on the question type, including the answer. */
function TypeFields({
  question,
  type,
  onChange,
}: {
  question: Question;
  type: QuestionType;
  onChange: (patch: Partial<Question>) => void;
}) {
  const options = question.options ?? [];
  const setOption = (i: number, value: string) => {
    const next = options.map((o, j) => (j === i ? value : o));
    // Keep the multiple-choice answer pointing at the same choice while it's edited.
    const patch: Partial<Question> = { options: next };
    if (type === "multipleChoice" && question.answer === options[i]) patch.answer = value;
    onChange(patch);
  };

  const answerInput = (placeholder: string, label = "Answer") => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="q-answer">{label}</Label>
      <input
        id="q-answer"
        value={question.answer}
        onChange={(e) => onChange({ answer: e.target.value })}
        placeholder={placeholder}
        className={field}
      />
    </div>
  );

  switch (type) {
    case "multipleChoice":
      return (
        <div className="flex flex-col gap-1.5">
          <Label>Choices · tap the circle on the right one</Label>
          {options.map((o, i) => {
            const right = o !== "" && o === question.answer;
            return (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Mark ${CHOICE_LETTERS[i]} correct`}
                  onClick={() => onChange({ answer: o })}
                  className={`h-8 w-8 shrink-0 rounded-full font-display text-[15px] font-black ${right ? "bg-correct text-white" : "bg-bg text-text-dim ring-1 ring-panel-border"}`}
                >
                  {CHOICE_LETTERS[i]}
                </button>
                <input value={o} onChange={(e) => setOption(i, e.target.value)} placeholder={`Choice ${CHOICE_LETTERS[i]}`} className={field} />
                {options.length > MIN_CHOICES && (
                  <button
                    type="button"
                    aria-label="Remove choice"
                    onClick={() => onChange({ options: options.filter((_, j) => j !== i), ...(right && { answer: "" }) })}
                    className="h-8 w-8 shrink-0 rounded-lg text-text-dim hover:text-wrong-soft"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          {options.length < MAX_CHOICES && (
            <button type="button" onClick={() => onChange({ options: [...options, ""] })} className="self-start text-[13px] font-semibold text-text-muted hover:text-text">
              + Add choice
            </button>
          )}
        </div>
      );
    case "trueFalse":
      return (
        <div className="flex flex-col gap-1.5">
          <Label>Answer</Label>
          <div className="grid grid-cols-2 gap-2">
            {["True", "False"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange({ answer: v })}
                className={`h-11 rounded-[12px] font-semibold ring-2 ${question.answer === v ? (v === "True" ? "bg-correct text-white ring-correct" : "bg-wrong text-white ring-wrong") : "bg-bg ring-panel-border"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      );
    case "closest":
      return (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-target">Target number</Label>
            <input
              id="q-target"
              type="number"
              step="any"
              value={question.target ?? ""}
              onChange={(e) => onChange({ target: e.target.value === "" ? undefined : Number(e.target.value) })}
              placeholder="e.g. 8849"
              className={field}
            />
          </div>
          {answerInput("Defaults to the number, e.g. “8,849 m”", "Answer as shown (optional)")}
        </>
      );
    case "order":
    case "connection": {
      const count = type === "order" ? ORDER_ITEMS : CONNECTION_CLUES;
      return (
        <>
          <div className="flex flex-col gap-1.5">
            <Label>{type === "order" ? "Items, in the correct order (earliest first)" : "The four clues"}</Label>
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 text-center font-mono text-[12px] text-text-dim">{i + 1}</span>
                <input value={options[i] ?? ""} onChange={(e) => setOption(i, e.target.value)} className={field} />
              </div>
            ))}
            {type === "order" && <p className="text-[12px] text-text-muted">The TV shows them shuffled and labeled A–D.</p>}
          </div>
          {type === "connection" && answerInput("What they have in common")}
        </>
      );
    }
    default:
      return answerInput("Shown on the host's phone, then on the TV");
  }
}

/** Sets up the fields a type needs, keeping whatever still makes sense. */
function switchType(q: Question, type: QuestionType): Partial<Question> {
  const patch: Partial<Question> = { type: type === "standard" ? undefined : type };
  const old = q.options ?? [];
  const fill = (n: number) => Array.from({ length: n }, (_, i) => old[i] ?? "");
  patch.options =
    type === "multipleChoice"
      ? fill(Math.max(4, Math.min(old.length, MAX_CHOICES)))
      : type === "order"
        ? fill(ORDER_ITEMS)
        : type === "connection"
          ? fill(CONNECTION_CLUES)
          : undefined;
  if (type !== "closest") patch.target = undefined;
  if (type === "trueFalse" && !/^(true|false)$/i.test(q.answer)) patch.answer = "";
  if (type === "order") patch.answer = "";
  if (type === "wager" || type === "closest") patch.bonus = false;
  return patch;
}

/** Final round fields (shown in the board area on the Final round tab). */
export function FinalForm({
  final,
  onChange,
}: {
  final: FinalQuestion;
  onChange: (patch: Partial<FinalQuestion>) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 rounded-[16px] bg-panel p-6 ring-2 ring-[#3a1a5c]">
      <div className="font-mono text-[12px] uppercase tracking-[0.2em] text-[#b18cff]">Final wager round</div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="f-cat">Category (revealed before wagers)</Label>
        <input
          id="f-cat"
          value={final.category}
          onChange={(e) => onChange({ category: e.target.value })}
          placeholder="e.g. Space"
          className={`${field} font-display text-[22px] font-extrabold uppercase tracking-[0.05em]`}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="f-q">Question</Label>
        <textarea
          id="f-q"
          value={final.question}
          onChange={(e) => onChange({ question: e.target.value })}
          rows={4}
          className={`${field} resize-y`}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="f-a">Answer</Label>
        <input id="f-a" value={final.answer} onChange={(e) => onChange({ answer: e.target.value })} className={field} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Media</Label>
        <MediaDrop key="final" media={final.media} onChange={(media) => onChange({ media })} />
      </div>
    </div>
  );
}

export function InspectorButtons({
  onPreview,
  onSave,
  saveLabel,
}: {
  onPreview: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onPreview}
        className="h-11 rounded-[12px] bg-panel font-semibold ring-2 ring-panel-border hover:ring-cat-border"
      >
        Preview on TV
      </button>
      <button type="button" onClick={onSave} className="h-11 rounded-[12px] bg-gold font-semibold text-bg hover:brightness-105">
        {saveLabel}
      </button>
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40 ${checked ? "bg-hot" : "bg-[#2a3366]"}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-6" : "left-1"}`}
      />
    </button>
  );
}

