"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Wordmark } from "@/components/tv/parts";
import type { SavedGameMeta } from "@/lib/library";

function ago(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(ts).toLocaleDateString();
}

export function Sidebar({
  library,
  currentId,
  onNew,
  onImport,
  onOpen,
  onDelete,
  onExport,
  onPlay,
}: {
  library: SavedGameMeta[];
  currentId: string | null;
  onNew: () => void;
  onImport: (file: File) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onPlay: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <aside className="flex h-full min-h-0 flex-col gap-5 border-r border-panel-border bg-[#070c26] p-5">
      <Link href="/" aria-label="Back to setup">
        <Wordmark size={34} />
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onNew} className="h-10 rounded-[10px] bg-gold text-[14px] font-semibold text-bg hover:brightness-105">
          New game
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="h-10 rounded-[10px] bg-panel text-[14px] font-semibold ring-1 ring-panel-border hover:ring-cat-border"
        >
          Import
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim">Saved games</div>
        <ul className="-mx-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-1">
          {library.length === 0 && <li className="text-[13px] text-text-dim">Nothing saved yet.</li>}
          {library.map((g) => {
            const active = g.id === currentId;
            const confirming = confirmDelete === g.id;
            return (
              <li key={g.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onOpen(g.id)}
                  className={`flex w-full flex-col rounded-[10px] px-3 py-2 pr-9 text-left ${active ? "bg-panel ring-2 ring-cat-border" : "hover:bg-panel/60"}`}
                >
                  <span className="truncate text-[14px] font-semibold">{g.title}</span>
                  <span className="text-[11px] text-text-dim">{ago(g.updatedAt)}</span>
                </button>
                <button
                  type="button"
                  aria-label={confirming ? `Confirm delete ${g.title}` : `Delete ${g.title}`}
                  title={confirming ? "Click again to delete" : "Delete"}
                  onClick={() => {
                    if (confirming) {
                      onDelete(g.id);
                      setConfirmDelete(null);
                    } else setConfirmDelete(g.id);
                  }}
                  onBlur={() => setConfirmDelete(null)}
                  className={`absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md px-2 py-1 text-[12px] font-semibold transition ${confirming ? "bg-wrong text-white opacity-100" : "text-text-dim opacity-0 group-hover:opacity-100 hover:text-wrong-soft focus:opacity-100"}`}
                >
                  {confirming ? "Delete?" : "✕"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onExport}
          disabled={!currentId}
          className="h-10 rounded-[10px] bg-panel text-[14px] font-semibold ring-1 ring-panel-border hover:ring-cat-border disabled:opacity-40"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={onPlay}
          disabled={!currentId}
          className="tile-face h-12 text-[15px] font-bold text-white disabled:opacity-40"
        >
          Play on this screen
        </button>
      </div>
    </aside>
  );
}
