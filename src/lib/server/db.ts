import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with the service role key. The leaderboard
 * tables have row-level security on and no policies, so the browser's anon key
 * can't read or write them; everything goes through our API routes, which
 * check the Clerk session first.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const leaderboardConfigured = !!URL && !!SERVICE_KEY;

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!leaderboardConfigured) throw new Error("The leaderboard database isn't configured.");
  client ??= createClient(URL!, SERVICE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export interface LeaderboardRow {
  id: string;
  name: string;
  image_url: string | null;
  points: number;
  nights: number;
  wins: number;
  correct: number;
  last_played: string | null;
}

export interface NightSummary {
  id: string;
  title: string;
  finalized_at: string;
  winners: string[];
  players: number;
}
