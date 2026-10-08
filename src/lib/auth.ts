/**
 * Accounts (Clerk) are optional: without the keys the app still runs as a
 * plain team game, and everything about players and the season leaderboard
 * hides itself. Inlined at build time, so it's safe on the client too.
 */
export const authEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
