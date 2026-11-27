import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { googleConfig, GOOGLE_SCOPE } from "@/lib/google-calendar";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000"));
  try {
    const config = googleConfig();
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code", scope: GOOGLE_SCOPE, access_type: "offline", prompt: "consent", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
    const response = NextResponse.redirect(url);
    response.cookies.set("google_calendar_oauth", JSON.stringify({ state, verifier, userId: user.id }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/google-calendar", maxAge: 600 });
    return response;
  } catch {
    return NextResponse.json({ error: "Google Calendar is not configured. See DEPLOYMENT.md." }, { status: 503 });
  }
}
