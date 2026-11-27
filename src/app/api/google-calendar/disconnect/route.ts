import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { googleCalendarConnections } from "@/db/schema";
import { decryptToken, googleConfig } from "@/lib/google-calendar";
import { getSessionUser } from "@/lib/session";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (request.headers.get("origin") !== new URL(googleConfig().redirectUri).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const [connection] = await db.select().from(googleCalendarConnections).where(eq(googleCalendarConnections.userId, user.id)).limit(1);
  if (connection) {
    // Local disconnect succeeds even if Google is temporarily unreachable.
    try {
      await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: decryptToken(connection.refreshToken) }), cache: "no-store" });
    } catch { /* already revoked or offline */ }
    await db.delete(googleCalendarConnections).where(eq(googleCalendarConnections.userId, user.id));
  }
  return NextResponse.json({ ok: true });
}
