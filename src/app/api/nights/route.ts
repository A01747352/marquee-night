import { NextResponse } from "next/server";
import { jsonError, requireUser, upsertPlayerProfile } from "@/lib/server/api";
import { db } from "@/lib/server/db";

/** Opens a season night. The signed-in user becomes its host (the only one who can post results). */
export async function POST(request: Request) {
  const who = await requireUser();
  if ("response" in who) return who.response;

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const roomCode = typeof body?.roomCode === "string" ? body.roomCode.trim().toUpperCase().slice(0, 8) : "";
  if (!title || !roomCode) return jsonError(400, "A night needs a title and a room code.");

  try {
    await upsertPlayerProfile(who.userId);
    const { data, error } = await db()
      .from("nights")
      .insert({ title, room_code: roomCode, host_id: who.userId })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error("Creating a night failed", e);
    return jsonError(500, "Couldn't open a season night.");
  }
}
