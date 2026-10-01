"use client";

import { MAX_BONUS_TILES, type FinalQuestion, type Question } from "@/lib/game";
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
        <Label htmlFor="q-text">Question</Label>
        <textarea
          id="q-text"
          value={question.question}
          onChange={(e) => onChange({ question: e.target.value })}
          rows={4}
          placeholder="What do you want to ask?"
          className={`${field} resize-y leading-snug`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="q-answer">Answer</Label>
        <input
          id="q-answer"
          value={question.answer}
          onChange={(e) => onChange({ answer: e.target.value })}
          placeholder="Shown on the host's phone, then on the TV"
          className={field}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Media</Label>
        <MediaDrop key={tileKey} media={question.media} onChange={(media) => onChange({ media })} />
      </div>

      <div className="flex items-center justify-between rounded-[12px] bg-bg px-4 py-3 ring-1 ring-panel-border">
        <div>
          <div className="text-[15px] font-semibold">Bonus tile</div>
          <div className="text-[12px] text-text-muted">
            {bonusFull ? `Already ${MAX_BONUS_TILES} bonus tiles on this board` : "Team wagers; no steal"}
          </div>
        </div>
        <Toggle
          checked={question.bonus}
          disabled={bonusFull}
          label="Bonus tile"
          onChange={(bonus) => onChange({ bonus })}
        />
      </div>

      <InspectorButtons onPreview={onPreview} onSave={onSave} saveLabel={saveLabel} />
    </div>
  );
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

