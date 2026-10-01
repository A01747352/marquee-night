"use client";

import { del, get, set, update } from "idb-keyval";
import type { GameFile } from "@/lib/game";

/**
 * Saved games in this browser (IndexedDB, so embedded images fit). Each game is
 * stored under its own key; a small index keeps the sidebar list cheap.
 */
export interface SavedGameMeta {
  id: string;
  title: string;
  updatedAt: number;
}

const INDEX_KEY = "marquee-night:library";
const gameKey = (id: string) => `marquee-night:game:${id}`;

export async function listGames(): Promise<SavedGameMeta[]> {
  try {
    const index = (await get<SavedGameMeta[]>(INDEX_KEY)) ?? [];
    return [...index].sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function loadGame(id: string): Promise<GameFile | null> {
  return (await get<GameFile>(gameKey(id))) ?? null;
}

export async function saveGame(id: string, game: GameFile): Promise<SavedGameMeta> {
  const meta: SavedGameMeta = { id, title: game.title.trim() || "Untitled game", updatedAt: Date.now() };
  await set(gameKey(id), game);
  await update<SavedGameMeta[]>(INDEX_KEY, (index = []) => [meta, ...index.filter((m) => m.id !== id)]);
  return meta;
}

export async function deleteGame(id: string): Promise<void> {
  await del(gameKey(id));
  await update<SavedGameMeta[]>(INDEX_KEY, (index = []) => index.filter((m) => m.id !== id));
}

export function newGameId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
}
