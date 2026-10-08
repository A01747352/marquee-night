import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { authEnabled } from "@/lib/auth";
import { db, leaderboardConfigured } from "./db";

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** The signed-in Clerk user id, or an error response to return as-is. */
export async function requireUser(): Promise<{ userId: string } | { response: NextResponse }> {
  if (!leaderboardConfigured || !authEnabled) return { response: jsonError(503, "The season leaderboard isn't set up on this server.") };
  const { userId } = await auth();
  if (!userId) return { response: jsonError(401, "Sign in first.") };
  return { userId };
}

/** Saves the player's name and picture from Clerk (never from the request body). */
export async function upsertPlayerProfile(userId: string): Promise<void> {
  const user = await currentUser();
  const name =
    user?.fullName?.trim() ||
    user?.username?.trim() ||
    user?.primaryEmailAddress?.emailAddress.split("@")[0] ||
    "Player";
  const { error } = await db()
    .from("players")
    .upsert({ id: userId, name: name.slice(0, 40), image_url: user?.imageUrl ?? null, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
