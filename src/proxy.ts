import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { authEnabled } from "@/lib/auth";

// Clerk reads the session on every page and API route. Nothing is blocked
// here: pages that need a sign-in show their own prompt, and API routes check
// `auth()` themselves. Without Clerk keys this is a pass-through.
export default authEnabled ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
