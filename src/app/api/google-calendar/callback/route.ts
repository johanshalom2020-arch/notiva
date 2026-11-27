import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { googleCalendarConnections } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { encryptToken, googleConfig, GOOGLE_SCOPE, tokenRequest } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const config = googleConfig();
  const finish = (result: string) => {
    const url = new URL("/app/calendar", config.redirectUri);
    url.searchParams.set("google", result);
    const response = NextResponse.redirect(url);
    response.cookies.set("google_calendar_oauth", "", { path: "/api/google-calendar", maxAge: 0, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    return response;
  };
  try {
    const user = await getSessionUser();
    const saved = JSON.parse(request.cookies.get("google_calendar_oauth")?.value || "null");
    const state = request.nextUrl.searchParams.get("state") || "";
    const expected = typeof saved?.state === "string" ? saved.state : "";
    if (!user || saved?.userId !== user.id || !state || Buffer.byteLength(state) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(state), Buffer.from(expected))) return finish("invalid_state");
    const code = request.nextUrl.searchParams.get("code");
    if (!code) return finish("denied");
    const tokens = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: config.redirectUri, code_verifier: saved.verifier });
    if (!tokens.scope?.split(" ").includes(GOOGLE_SCOPE)) return finish("denied");
    // Never silently retain a token from a different Google account.
    if (!tokens.refresh_token) return finish("no_refresh_token");
    const refreshToken = encryptToken(tokens.refresh_token);
    await db.insert(googleCalendarConnections).values({ userId: user.id, refreshToken }).onConflictDoUpdate({ target: googleCalendarConnections.userId, set: { refreshToken, updatedAt: new Date() } });
    return finish("connected");
  } catch {
    return finish("error");
  }
}
