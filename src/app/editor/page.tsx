"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { BoardGrid } from "@/components/editor/BoardGrid";
import { FinalForm, InspectorButtons, TileInspector } from "@/components/editor/Inspector";
import { PreviewModal } from "@/components/editor/PreviewModal";
import { Sidebar } from "@/components/editor/Sidebar";
import {
  createEmptyGame,
  draftFromUnknown,
  exportGame,
  gameProgress,
  MAX_BONUS_TILES,
  MAX_TIMER_SECONDS,
  MIN_TIMER_SECONDS,
  validateGame,
  type FinalQuestion,
  type GameFile,
  type Question,
  type TileRef,
} from "@/lib/game";
import { deleteGame, listGames, loadGame, newGameId, saveGame, type SavedGameMeta } from "@/lib/library";

const AUTOSAVE_MS = 600;

type SaveState = "saved" | "saving" | "unsaved";
type Notice = { tone: "error" | "info"; text: string; items?: string[] };

export default function EditorPage() {
  return (
    <Suspense fallback={null}>
      <Editor />
    </Suspense>
  );
}

function Editor() {
  const router = useRouter();
  const params = useSearchParams();
  const idParam = params.get("id");

  const [library, setLibrary] = useState<SavedGameMeta[]>([]);
  const [doc, setDoc] = useState<{ id: string; game: GameFile } | null>(null);
  const [selected, setSelected] = useState<TileRef>({ col: 0, row: 0 });
  const [tab, setTab] = useState<"board" | "final">("board");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [preview, setPreview] = useState<TileRef | "final" | null>(null);

  const docRef = useRef(doc);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ---------- Saving ----------

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    const current = docRef.current;
    if (!current) return;
    setSaveState("saving");
    const meta = await saveGame(current.id, current.game);
    setLibrary((lib) => [meta, ...lib.filter((m) => m.id !== meta.id)]);
    // Only "saved" if nothing changed while we were writing.
    setSaveState(docRef.current === current ? "saved" : "unsaved");
  }, []);

  const edit = useCallback(
    (fn: (g: GameFile) => GameFile) => {
      setDoc((d) => {
        if (!d) return d;
        const next = { ...d, game: fn(d.game) };
        docRef.current = next;
        return next;
      });
      setSaveState("unsaved");
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, AUTOSAVE_MS);
    },
    [flush],
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (timer.current) {
        flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [flush]);

  // ---------- Loading ----------

  const createAndOpen = useCallback(
    async (game: GameFile = createEmptyGame()) => {
      const id = newGameId();
      const meta = await saveGame(id, game);
      setLibrary((lib) => [meta, ...lib]);
      router.push(`/editor?id=${id}`);
      return id;
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lib = await listGames();
      if (cancelled) return;
      setLibrary(lib);
      if (!idParam) {
        if (lib[0]) router.replace(`/editor?id=${lib[0].id}`);
        else await createAndOpen();
        return;
      }
      if (docRef.current?.id === idParam) return;
      const game = await loadGame(idParam);
      if (cancelled) return;
      if (!game) {
        setNotice({ tone: "error", text: "That saved game wasn't found in this browser." });
        router.replace("/editor");
        return;
      }
      const next = { id: idParam, game };
      docRef.current = next;
      setDoc(next);
      setSelected({ col: 0, row: 0 });
      setTab("board");
      setSaveState("saved");
    })();
    return () => {
      cancelled = true;
    };
  }, [idParam, router, createAndOpen]);

  const open = async (id: string) => {
    if (id === doc?.id) return;
    if (timer.current) await flush();
    setNotice(null);
    router.push(`/editor?id=${id}`);
  };

  // ---------- Sidebar actions ----------

  const importFile = async (file: File) => {
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setNotice({ tone: "error", text: `${file.name} isn't valid JSON.` });
      return;
    }
    if (timer.current) await flush();
    await createAndOpen(draftFromUnknown(data));
    const check = validateGame(data);
    setNotice(
      check.ok
        ? { tone: "info", text: `Imported ${file.name}. It's ready to play.` }
        : { tone: "info", text: `Imported ${file.name} as a draft. Still to do:`, items: check.errors },
    );
  };

  const remove = async (id: string) => {
    await deleteGame(id);
    const lib = await listGames();
    setLibrary(lib);
    if (id === doc?.id) {
      docRef.current = null;
      setDoc(null);
      clearTimeout(timer.current);
      timer.current = undefined;
      router.replace(lib[0] ? `/editor?id=${lib[0].id}` : "/editor");
    }
  };

  const exportJson = () => {
    if (!doc) return;
    const blob = new Blob([exportGame(doc.game)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${doc.game.title.trim().replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").toLowerCase() || "game"}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const play = async () => {
    if (!doc) return;
    const check = validateGame(doc.game);
    if (!check.ok) {
      setNotice({ tone: "error", text: "Finish these before playing:", items: check.errors });
      return;
    }
    await flush();
    router.push(`/?game=${doc.id}`);
  };

  // ---------- Board edits ----------

  const updateQuestion = (tile: TileRef, patch: Partial<Question>) =>
    edit((g) => ({
      ...g,
      categories: g.categories.map((c, ci) =>
        ci !== tile.col
          ? c
          : {
              ...c,
              questions: c.questions.map((q, qi) => {
                if (qi !== tile.row) return q;
                const next = { ...q, ...patch };
                if ("media" in patch && !patch.media) delete next.media;
                return next;
              }),
            },
      ),
    }));

  const renameCategory = (col: number, name: string) =>
    edit((g) => ({ ...g, categories: g.categories.map((c, ci) => (ci === col ? { ...c, name } : c)) }));

  const updateFinal = (patch: Partial<FinalQuestion>) =>
    edit((g) => {
      const final = { ...g.final, ...patch };
      if ("media" in patch && !patch.media) delete final.media;
      return { ...g, final };
    });

  const randomizeBonus = () =>
    edit((g) => {
      // Two distinct tiles, skipping the 100 row so a bonus is worth wagering on.
      const pool = g.categories.flatMap((c, col) => c.questions.map((_, row) => ({ col, row }))).filter((t) => t.row > 0);
      const picks = new Set<string>();
      while (picks.size < Math.min(MAX_BONUS_TILES, pool.length)) {
        const t = pool[crypto.getRandomValues(new Uint32Array(1))[0] % pool.length];
        picks.add(`${t.col}-${t.row}`);
      }
      return {
        ...g,
        categories: g.categories.map((c, col) => ({
          ...c,
          questions: c.questions.map((q, row) => ({ ...q, bonus: picks.has(`${col}-${row}`) })),
        })),
      };
    });

  if (!doc) {
    return <div className="flex h-dvh items-center justify-center text-text-dim">Loading…</div>;
  }

  const { game } = doc;
  const progress = gameProgress(game);
  const q = game.categories[selected.col].questions[selected.row];
  const saveLabel = saveState === "saved" ? "Saved ✓" : saveState === "saving" ? "Saving…" : "Save";

  const status = [
    `${progress.written} of ${progress.total} written`,
    `${progress.bonus} bonus tile${progress.bonus === 1 ? "" : "s"}`,
    progress.namedCategories < 6 ? `${6 - progress.namedCategories} unnamed categor${6 - progress.namedCategories === 1 ? "y" : "ies"}` : null,
    progress.finalReady ? "final question ready" : "final question missing",
  ].filter(Boolean);
  const ready = validateGame(game).ok;

  return (
    <div className="grid h-dvh grid-cols-[260px_minmax(0,1fr)_400px] overflow-hidden">
      <Sidebar
        library={library}
        currentId={doc.id}
        onNew={async () => {
          if (timer.current) await flush();
          setNotice(null);
          await createAndOpen();
        }}
        onImport={importFile}
        onOpen={open}
        onDelete={remove}
        onExport={exportJson}
        onPlay={play}
      />

      <main className="flex min-h-0 flex-col gap-5 overflow-y-auto p-7">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-[260px] flex-1 flex-col gap-1">
            <label htmlFor="title" className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
              Title
            </label>
            <input
              id="title"
              value={game.title}
              onChange={(e) => edit((g) => ({ ...g, title: e.target.value }))}
              className="h-12 rounded-lg bg-bg px-3 text-[22px] font-semibold outline-none ring-1 ring-panel-border focus:ring-2 focus:ring-cat-border"
            />
          </div>
          <div className="flex w-[110px] flex-col gap-1">
            <label htmlFor="timer" className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
              Timer (s)
            </label>
            <input
              id="timer"
              type="number"
              min={MIN_TIMER_SECONDS}
              max={MAX_TIMER_SECONDS}
              value={game.timerSeconds}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value));
                if (Number.isFinite(n)) edit((g) => ({ ...g, timerSeconds: n }));
              }}
              onBlur={() =>
                edit((g) => ({
                  ...g,
                  timerSeconds: Math.min(MAX_TIMER_SECONDS, Math.max(MIN_TIMER_SECONDS, g.timerSeconds || 30)),
                }))
              }
              className="h-12 rounded-lg bg-bg px-3 text-[20px] font-semibold outline-none ring-1 ring-panel-border focus:ring-2 focus:ring-cat-border"
            />
          </div>
          <button
            type="button"
            onClick={randomizeBonus}
            className="h-12 rounded-lg bg-panel px-4 text-[14px] font-semibold ring-1 ring-panel-border hover:ring-hot"
          >
            Randomize bonus
          </button>
        </div>

        <div className="flex gap-1 border-b border-panel-border" role="tablist">
          {(["board", "final"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-[14px] font-semibold ${tab === t ? "border-gold text-text" : "border-transparent text-text-dim hover:text-text"}`}
            >
              {t === "board" ? "Board" : "Final round"}
              {t === "final" && !progress.finalReady && <span className="ml-1.5 text-wrong-soft">•</span>}
            </button>
          ))}
        </div>

        {notice && (
          <div
            className={`rounded-xl border-2 px-4 py-3 text-[14px] ${notice.tone === "error" ? "border-wrong/60 text-wrong-soft" : "border-cat-border text-text-muted"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="font-semibold">{notice.text}</span>
              <button type="button" onClick={() => setNotice(null)} className="text-text-dim hover:text-text" aria-label="Dismiss">
                ✕
              </button>
            </div>
            {notice.items && (
              <ul className="mt-1 max-h-[140px] list-disc overflow-y-auto pl-5">
                {notice.items.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "board" ? (
          <BoardGrid game={game} selected={selected} onSelect={setSelected} onRenameCategory={renameCategory} />
        ) : (
          <FinalForm final={game.final} onChange={updateFinal} />
        )}

        <div className="flex items-center justify-between text-[14px]">
          <span className="text-text-muted">{status.join(" · ")}</span>
          <span className={ready ? "font-semibold text-correct-soft" : "text-text-dim"}>
            {ready ? "Ready to play" : "Draft"}
          </span>
        </div>
      </main>

      <aside className="min-h-0 overflow-y-auto border-l border-panel-border bg-[#070c26] p-6">
        {tab === "board" ? (
          <TileInspector
            tileKey={`${doc.id}-${selected.col}-${selected.row}`}
            category={game.categories[selected.col].name}
            question={q}
            bonusCount={progress.bonus}
            onChange={(patch) => updateQuestion(selected, patch)}
            onPreview={() => setPreview(selected)}
            onSave={flush}
            saveLabel={saveLabel}
          />
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">Final round</div>
              <p className="mt-2 text-[14px] leading-relaxed text-text-muted">
                Shown after the board is cleared. Every team with a positive score wagers in secret, then everyone
                answers this one question.
              </p>
            </div>
            <InspectorButtons onPreview={() => setPreview("final")} onSave={flush} saveLabel={saveLabel} />
          </div>
        )}
      </aside>

      {preview && (
        <PreviewModal game={game} tile={preview === "final" ? null : preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
