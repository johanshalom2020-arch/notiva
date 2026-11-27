import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { googleCalendarConnections } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { decryptToken, googleConfig, tokenRequest } from "@/lib/google-calendar";

import { normalizeGoogleEvents, type GoogleEvent } from "@/lib/google-calendar-events";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try { googleConfig(); } catch { return NextResponse.json({ connected: false, configured: false }); }
  let connected = false;
  try {
    const [connection] = await db.select().from(googleCalendarConnections).where(eq(googleCalendarConnections.userId, user.id)).limit(1);
    if (!connection) return NextResponse.json({ connected: false, configured: true });
    connected = true;
    const min = request.nextUrl.searchParams.get("timeMin") || "";
    const max = request.nextUrl.searchParams.get("timeMax") || "";
    const zone = request.nextUrl.searchParams.get("timeZone") || "UTC";
    const from = Date.parse(min), to = Date.parse(max);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > 62 * 86400000) return NextResponse.json({ error: "Invalid calendar range." }, { status: 400 });
    let formatter: Intl.DateTimeFormat;
    try { formatter = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }); }
    catch { return NextResponse.json({ error: "Invalid time zone." }, { status: 400 }); }
    const { access_token } = await tokenRequest({ grant_type: "refresh_token", refresh_token: decryptToken(connection.refreshToken) });
    const items: GoogleEvent[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      url.search = new URLSearchParams({ timeMin: new Date(from).toISOString(), timeMax: new Date(to).toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "250", ...(pageToken ? { pageToken } : {}) }).toString();
      const response = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` }, cache: "no-store" });
      if (!response.ok) throw new Error("Google Calendar could not be loaded.");
      const body: { items?: GoogleEvent[]; nextPageToken?: string } = await response.json();
      items.push(...(body.items || []));
      pageToken = body.nextPageToken;
      if (items.length > 10000) throw new Error("Too many Google Calendar events in this range.");
    } while (pageToken);
    const events = normalizeGoogleEvents(items, formatter, from, to);
    return NextResponse.json({ connected: true, configured: true, events }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Google Calendar fetch failed:", error);
    return NextResponse.json({ connected, configured: true, error: "Couldn't load Google Calendar. Try reconnecting." }, { status: 502 });
  }
}
