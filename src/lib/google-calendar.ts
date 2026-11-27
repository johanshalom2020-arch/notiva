import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export function googleConfig() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_TOKEN_ENCRYPTION_KEY } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI || !GOOGLE_TOKEN_ENCRYPTION_KEY || !/^[a-f\d]{64}$/i.test(GOOGLE_TOKEN_ENCRYPTION_KEY)) {
    throw new Error("Google Calendar is not configured. See DEPLOYMENT.md.");
  }
  const redirect = new URL(GOOGLE_REDIRECT_URI);
  if ((redirect.protocol !== "https:" && !(redirect.protocol === "http:" && redirect.hostname === "localhost")) || redirect.pathname !== "/api/google-calendar/callback" || redirect.search || redirect.hash) {
    throw new Error("Invalid Google Calendar redirect URI.");
  }
  return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, redirectUri: GOOGLE_REDIRECT_URI, key: Buffer.from(GOOGLE_TOKEN_ENCRYPTION_KEY, "hex") };
}

export function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", googleConfig().key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptToken(value: string) {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted token");
  const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", googleConfig().key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export async function tokenRequest(params: Record<string, string>) {
  const config = googleConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, client_id: config.clientId, client_secret: config.clientSecret }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Google authorization failed. Please reconnect Google Calendar.");
  return response.json() as Promise<{ access_token: string; refresh_token?: string; scope?: string }>;
}
