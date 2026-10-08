import { NextResponse } from "next/server";
import { finishPlaces, MAX_TEAMS, rankingPoints } from "@/lib/game";
import { jsonError, requireUser, UUID } from "@/lib/server/api";
import { db } from "@/lib/server/db";

interface TeamResult {
  name: string;
  score: number;
  correct: number;
  playerIds: string[];
}

function parseTeams(body: unknown): TeamResult[] | null {
  const teams = (body as { teams?: unknown })?.teams;
  if (!Array.isArray(teams) || teams.length < 1 || teams.length > MAX_TEAMS) return null;
  const out: TeamResult[] = [];
  for (const t of teams) {
    if (
      typeof t?.name !== "string" ||
      !Number.isInteger(t.score) ||
      !Number.isInteger(t.correct) ||
      t.correct < 0 ||
      !Array.isArray(t.playerIds) ||
      !t.playerIds.every((p: unknown) => typeof p === "string")
    ) {
      return null;
    }
    out.push({ name: t.name.slice(0, 40), score: t.score, correct: t.correct, playerIds: t.playerIds });
  }
  return out;
}

/**
 * The night's host posts the final standings. Points are worked out here, and
 * only players who registered for the night from their own phone get any.
 * A night is scored once; later posts are ignored.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const who = await requireUser();
  if ("response" in who) return who.response;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return jsonError(404, "No such night.");

  const teams = parseTeams(await request.json().catch(() => null));
  if (!teams) return jsonError(400, "Those results don't look right.");

  try {
    const { data: night, error: nightError } = await db()
      .from("nights")
      .select("id, host_id, finalized_at")
      .eq("id", id)
      .maybeSingle();
    if (nightError) throw nightError;
    if (!night) return jsonError(404, "No such night.");
    if (night.host_id !== who.userId) return jsonError(403, "Only the host who opened this night can post its results.");
    if (night.finalized_at) return NextResponse.json({ ok: true, alreadySaved: true });

    const { data: joined, error: joinedError } = await db().from("night_players").select("player_id").eq("night_id", id);
    if (joinedError) throw joinedError;
    const registered = new Set((joined ?? []).map((r) => r.player_id as string));

    const places = finishPlaces(teams);
    const seen = new Set<string>();
    const rows = teams.flatMap((t, i) =>
      t.playerIds
        .filter((pid) => registered.has(pid) && !seen.has(pid) && seen.add(pid))
        .map((pid) => ({
          night_id: id,
          player_id: pid,
          team_name: t.name,
          place: places[i],
          team_score: t.score,
          correct: t.correct,
          points: rankingPoints(places[i], t.correct),
        })),
    );

    if (rows.length > 0) {
      const { error } = await db().from("night_players").upsert(rows, { onConflict: "night_id,player_id" });
      if (error) throw error;
    }
    const { error: finalError } = await db()
      .from("nights")
      .update({ finalized_at: new Date().toISOString() })
      .eq("id", id)
      .is("finalized_at", null);
    if (finalError) throw finalError;

    return NextResponse.json({ ok: true, scored: rows.length });
  } catch (e) {
    console.error("Saving results failed", e);
    return jsonError(500, "Couldn't save the results.");
  }
}
