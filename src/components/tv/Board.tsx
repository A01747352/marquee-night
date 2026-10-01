"use client";

import type { PublicView } from "@/lib/game";
import { Scoreboard } from "./Scoreboard";
import { FitText, Wordmark } from "./parts";

export function Board({
  view,
  roomCode,
  hostConnected,
  onPick,
}: {
  view: PublicView;
  roomCode: string;
  hostConnected: boolean;
  /** Lets the laptop pick tiles by clicking; omit to make the board read-only. */
  onPick?: (col: number, row: number) => void;
}) {
  const rows = view.categories[0]?.tiles.length ?? 5;

  return (
    <div className="bg-board-glow flex h-full flex-col px-[80px] pt-[32px] pb-[44px]">
      <header className="grid h-[56px] grid-cols-[1fr_auto_1fr] items-center">
        <Wordmark size={44} />
        <div className="max-w-[900px] truncate text-[28px] font-semibold text-text-muted">{view.title}</div>
        <div className="flex items-center gap-3 justify-self-end font-mono text-[22px] tracking-[0.2em] text-text-dim">
          <span
            title={hostConnected ? "Host connected" : "Host remote not connected"}
            className={`h-3 w-3 rounded-full ${hostConnected ? "bg-correct-soft" : "bg-wrong-soft"}`}
          />
          ROOM {roomCode}
        </div>
      </header>

      <div className="mt-[28px] grid grid-cols-6 gap-[14px]">
        {view.categories.map((c, col) => (
          <div
            key={col}
            className="flex h-[108px] items-center justify-center rounded-[10px] border-2 border-cat-border bg-cat-bg px-4"
          >
            <FitText
              max={38}
              min={22}
              step={2}
              className="flex h-full w-full items-center justify-center text-center font-display font-extrabold uppercase leading-[0.95] tracking-[0.06em] text-balance"
            >
              {c.name}
            </FitText>
          </div>
        ))}

        {Array.from({ length: rows }, (_, row) =>
          view.categories.map((c, col) => {
            const tile = c.tiles[row];
            if (tile.played) return <div key={`${col}-${row}`} className="tile-played h-[108px]" />;
            return (
              <button
                key={`${col}-${row}`}
                type="button"
                disabled={!onPick}
                onClick={() => onPick?.(col, row)}
                className="tile-face flex h-[108px] items-center justify-center font-display text-[76px] font-black leading-none text-glow-gold enabled:cursor-pointer enabled:hover:brightness-110"
              >
                {tile.value}
              </button>
            );
          }),
        )}
      </div>

      <div className="mt-auto">
        <Scoreboard teams={view.teams} activeId={view.turnTeamId} />
      </div>
    </div>
  );
}
