"use client";

import { animate, motion } from "framer-motion";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { formatDelta, formatScore, type TileRef } from "@/lib/game";

// ---------- Board geometry (shared by Board and the tile flip) ----------

export const BOARD = {
  padX: 80,
  padTop: 32,
  headerH: 56,
  gridTop: 28,
  cellH: 108,
  gap: 14,
  cols: 6,
} as const;

const TILE_W = (1920 - BOARD.padX * 2 - BOARD.gap * (BOARD.cols - 1)) / BOARD.cols;

/** Where a value tile sits on the 1920×1080 canvas. */
export function tileRect(tile: TileRef) {
  const firstRowTop = BOARD.padTop + BOARD.headerH + BOARD.gridTop + BOARD.cellH + BOARD.gap;
  return {
    left: BOARD.padX + tile.col * (TILE_W + BOARD.gap),
    top: firstRowTop + tile.row * (BOARD.cellH + BOARD.gap),
    width: TILE_W,
    height: BOARD.cellH,
  };
}

// ---------- Memory across screens ----------

/**
 * Screens mount and unmount as the game moves on, so the TV remembers what it
 * last showed (scores, picking team). That lets the board count scores up from
 * their old values and slide the ring from the previous team when it returns.
 */
interface TvMemory {
  getScore(teamId: string): number | undefined;
  setScore(teamId: string, score: number): void;
  getActive(): string | null | undefined;
  setActive(id: string | null): void;
}

function createMemory(): TvMemory {
  const scores = new Map<string, number>();
  let active: string | null | undefined;
  return {
    getScore: (id) => scores.get(id),
    setScore: (id, score) => void scores.set(id, score),
    getActive: () => active,
    setActive: (id) => void (active = id),
  };
}

const MemoryContext = createContext<TvMemory | null>(null);

export function TvMemoryProvider({ children }: { children: ReactNode }) {
  const [memory] = useState(createMemory);
  return <MemoryContext.Provider value={memory}>{children}</MemoryContext.Provider>;
}

function useMemory() {
  return useContext(MemoryContext);
}

/** The picking team as last shown; switches to `activeId` after `delayMs` so the ring visibly slides. */
export function useSlidingActive(activeId: string | null, delayMs = 450) {
  const memory = useMemory();
  const [shown, setShown] = useState(() => memory?.getActive() ?? activeId);

  useEffect(() => {
    memory?.setActive(activeId);
    if (shown === activeId) return;
    const t = setTimeout(() => setShown(activeId), delayMs);
    return () => clearTimeout(t);
  }, [activeId, shown, delayMs, memory]);

  return shown;
}

// ---------- Animated score ----------

/** Counts from the last score this TV showed to the new one, flashing the delta. */
export function AnimatedScore({
  teamId,
  score,
  className = "",
  deltaClassName = "",
  delay = 0.35,
}: {
  teamId: string;
  score: number;
  className?: string;
  deltaClassName?: string;
  delay?: number;
}) {
  const memory = useMemory();
  const [from] = useState(() => memory?.getScore(teamId) ?? score);
  const [shown, setShown] = useState(from);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);
  // What's on screen right now; counting always starts from here (safe under StrictMode re-runs).
  const displayed = useRef(from);

  useEffect(() => {
    memory?.setScore(teamId, score);
    const start = displayed.current;
    if (start === score) return;
    const controls = animate(start, score, {
      duration: Math.min(1.2, 0.5 + Math.abs(score - start) / 2000),
      delay,
      ease: "easeOut",
      onPlay: () => setDelta({ value: score - start, key: Date.now() }),
      onUpdate: (v) => {
        displayed.current = Math.round(v);
        setShown(displayed.current);
      },
    });
    return () => controls.stop();
  }, [score, teamId, delay, memory]);

  return (
    <span className="relative inline-block">
      <span className={`${className} ${shown < 0 ? "text-wrong-soft" : ""}`}>{formatScore(shown)}</span>
      {delta && (
        <motion.span
          key={delta.key}
          initial={{ opacity: 0, y: 8, scale: 0.8 }}
          animate={{ opacity: [0, 1, 1, 0], y: -34, scale: 1 }}
          transition={{ duration: 1.8, times: [0, 0.15, 0.7, 1] }}
          className={`pointer-events-none absolute right-0 -top-6 font-display font-black ${delta.value > 0 ? "text-correct-soft" : "text-wrong-soft"} ${deltaClassName}`}
        >
          {formatDelta(delta.value)}
        </motion.span>
      )}
    </span>
  );
}

// ---------- Tile flip ----------

/** Seconds until the flipping tile covers the whole screen. */
export const FLIP_COVER_S = 0.6;

/**
 * Plays once per tile: the tile turns over and grows to fill the screen, then
 * fades to reveal the question (or bonus) screen underneath.
 */
export function TileFlip({ tile, value }: { tile: TileRef; value: number }) {
  const [done, setDone] = useState(false);
  if (done) return null;
  const rect = tileRect(tile);

  // Outer box: position, size and fade. Inner box: the 3D turn. Keeping opacity
  // off the 3D element matters: opacity flattens 3D and shows the back face.
  return (
    <motion.div
      className="pointer-events-none absolute z-40"
      style={{ perspective: 2400 }}
      initial={{ ...rect, opacity: 1 }}
      animate={{ left: 0, top: 0, width: 1920, height: 1080, opacity: 0 }}
      transition={{
        duration: FLIP_COVER_S,
        ease: [0.65, 0, 0.35, 1],
        opacity: { delay: FLIP_COVER_S + 0.05, duration: 0.3 },
      }}
      onAnimationComplete={() => setDone(true)}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        initial={{ rotateY: 0 }}
        animate={{ rotateY: 180 }}
        transition={{ duration: FLIP_COVER_S, ease: [0.65, 0, 0.35, 1] }}
      >
        <div
          className="tile-face absolute inset-0 flex items-center justify-center font-display text-[76px] font-black text-glow-gold"
          style={{ backfaceVisibility: "hidden" }}
        >
          {value}
        </div>
        <div
          className="bg-question-glow absolute inset-0 rounded-[10px]"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        />
      </motion.div>
    </motion.div>
  );
}
