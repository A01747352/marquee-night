"use client";

import type { GameState } from "@/lib/game";

/** What the TV sends when a ranked night ends. The server works out the points. */
export interface ResultsPayload {
  teams: { name: string; score: number; correct: number; playerIds: string[] }[];
}

export function resultsPayload(state: GameState): ResultsPayload {
  return {
    teams: state.teams.map((t) => ({
      name: t.name,
      score: t.score,
      correct: t.correct ?? 0,
      playerIds: (state.players ?? []).filter((p) => p.teamId === t.id).map((p) => p.id),
    })),
  };
}

/** Opens a season night for this game. Resolves to null when the leaderboard isn't available. */
export async function createNight(title: string, roomCode: string): Promise<{ id: string } | { error: string }> {
  try {
    const res = await fetch("/api/nights", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, roomCode }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body.error ?? "The leaderboard isn't available right now." };
    return { id: body.id };
  } catch {
    return { error: "The leaderboard isn't reachable." };
  }
}

/** Registers the signed-in player for a night (proves they were really here). */
export async function joinNight(nightId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/nights/${encodeURIComponent(nightId)}/join`, { method: "POST" });
    if (res.ok) return null;
    const body = await res.json().catch(() => ({}));
    return body.error ?? "Couldn't join the season night.";
  } catch {
    return "Couldn't reach the leaderboard.";
  }
}

export async function submitResults(nightId: string, state: GameState): Promise<string | null> {
  try {
    const res = await fetch(`/api/nights/${encodeURIComponent(nightId)}/results`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(resultsPayload(state)),
    });
    if (res.ok) return null;
    const body = await res.json().catch(() => ({}));
    return body.error ?? `Saving failed (${res.status}).`;
  } catch {
    return "Couldn't reach the leaderboard.";
  }
}
