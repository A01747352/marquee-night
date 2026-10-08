import { NextResponse } from "next/server";
import { jsonError, requireUser, upsertPlayerProfile, UUID } from "@/lib/server/api";
import { db } from "@/lib/server/db";

/**
 * A signed-in player registers for a night from their own phone. Only players
 * registered this way can earn points for it, so the TV can't credit someone
 * who wasn't there.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const who = await requireUser();
  if ("response" in who) return who.response;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return jsonError(404, "No such night.");

  try {
    const { data: night, error: nightError } = await db()
      .from("nights")
      .select("id, finalized_at")
      .eq("id", id)
      .maybeSingle();
    if (nightError) throw nightError;
    if (!night) return jsonError(404, "No such night.");
    if (night.finalized_at) return jsonError(409, "This night is already over.");

    await upsertPlayerProfile(who.userId);
    const { error } = await db()
      .from("night_players")
      .upsert({ night_id: id, player_id: who.userId }, { onConflict: "night_id,player_id", ignoreDuplicates: true });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Joining a night failed", e);
    return jsonError(500, "Couldn't join the night.");
  }
}
