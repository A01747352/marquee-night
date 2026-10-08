"use client";

import { isDeepCutRow, QUESTION_TYPES, questionProblem, questionType, type GameFile, type TileRef } from "@/lib/game";

/** 6-column board: editable category names above 30 question cells. */
export function BoardGrid({
  game,
  selected,
  onSelect,
  onRenameCategory,
}: {
  game: GameFile;
  selected: TileRef | null;
  onSelect: (tile: TileRef) => void;
  onRenameCategory: (col: number, name: string) => void;
}) {
  const rows = game.categories[0]?.questions.length ?? 5;

  return (
    <div className="grid grid-cols-6 gap-2.5">
      {game.categories.map((c, col) => (
        // A two-line textarea so long names wrap like they do on the TV.
        <textarea
          key={`cat-${col}`}
          value={c.name}
          onChange={(e) => onRenameCategory(col, e.target.value.replace(/\n/g, " "))}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          placeholder={`Category ${col + 1}`}
          aria-label={`Category ${col + 1} name`}
          maxLength={40}
          rows={2}
          className={`h-14 min-w-0 resize-none overflow-hidden rounded-[10px] border-2 bg-cat-bg px-2 py-1.5 text-center font-display text-[15px] leading-[1.1] font-extrabold uppercase tracking-[0.04em] outline-none placeholder:text-text-dim/60 focus:border-gold ${c.name.trim() ? "border-cat-border" : "border-dashed border-wrong/70"}`}
        />
      ))}

      {Array.from({ length: rows }, (_, row) =>
        game.categories.map((c, col) => {
          const q = c.questions[row];
          const isSelected = selected?.col === col && selected?.row === row;
          const problem = questionProblem(q);
          const written = problem === null;
          const type = questionType(q);
          const started = q.question.trim() !== "" || q.answer.trim() !== "" || type !== "standard";
          const missing = problem;

          return (
            <button
              key={`${col}-${row}`}
              type="button"
              onClick={() => onSelect({ col, row })}
              aria-label={`${c.name || `Category ${col + 1}`} ${q.value}${written ? "" : " (incomplete)"}`}
              aria-pressed={isSelected}
              className={`relative flex h-[104px] min-w-0 flex-col items-start gap-1 overflow-hidden rounded-[10px] p-2.5 text-left transition ${
                isSelected
                  ? "border-2 border-tile-top bg-panel shadow-[0_0_20px_rgba(53,105,255,0.45)]"
                  : written
                    ? "border-2 border-panel-border bg-panel hover:border-cat-border"
                    : "border-2 border-dashed border-wrong/70 bg-panel/50 hover:border-wrong"
              }`}
            >
              <div className="flex w-full items-center justify-between gap-1">
                <span
                  className={`font-display text-[20px] font-black leading-none ${isDeepCutRow(row, rows) ? "text-wrong-soft" : "text-gold"}`}
                  title={isDeepCutRow(row, rows) ? "Deep cut: the TV makes this row look and sound scary" : undefined}
                >
                  {q.value}
                </span>
                <span className="flex gap-1">
                  {type !== "standard" && (
                    <span className="truncate rounded bg-cat-bg px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-text-muted">
                      {QUESTION_TYPES[type].label}
                    </span>
                  )}
                  {q.bonus && (
                    <span className="rounded bg-hot px-1.5 py-0.5 font-mono text-[9px] tracking-[0.12em] text-white">
                      BONUS
                    </span>
                  )}
                </span>
              </div>
              {q.media && (
                <span className="absolute right-1.5 bottom-1.5 rounded bg-bg px-1 font-mono text-[9px] tracking-[0.1em] text-text-muted">
                  {q.media.type === "image" ? "IMG" : q.media.type === "video" ? "VIDEO" : "AUDIO"}
                </span>
              )}
              {started ? (
                <>
                  <span className="line-clamp-2 text-[12px] leading-snug text-text-muted">{q.question || "—"}</span>
                  {missing && <span className="mt-auto line-clamp-2 text-[11px] font-semibold leading-tight text-wrong-soft">{missing}</span>}
                </>
              ) : (
                <span className="m-auto text-[13px] font-semibold text-wrong-soft">Empty</span>
              )}
            </button>
          );
        }),
      )}
    </div>
  );
}
