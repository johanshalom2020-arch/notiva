import { test } from "node:test";
import assert from "node:assert/strict";
import { encryptToken, decryptToken } from "../src/lib/google-calendar.ts";
import { normalizeGoogleEvents } from "../src/lib/google-calendar-events.ts";

process.env.GOOGLE_CLIENT_ID = "test";
process.env.GOOGLE_CLIENT_SECRET = "test";
process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/google-calendar/callback";
process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "11".repeat(32);

test("refresh tokens are encrypted with a random IV and authenticated", () => {
  const encrypted = encryptToken("secret-refresh-token");
  assert.notEqual(encrypted, encryptToken("secret-refresh-token"));
  assert.equal(decryptToken(encrypted), "secret-refresh-token");
  const [iv, tag, data] = encrypted.split(".");
  const changed = Buffer.from(data, "base64url");
  changed[0] ^= 1;
  assert.throws(() => decryptToken(`${iv}.${tag}.${changed.toString("base64url")}`));
});

test("Google instances respect browser timezone and all-day exclusive end", () => {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const events = normalizeGoogleEvents([
    { id: "timed", start: { dateTime: "2026-11-01T23:30:00Z" }, summary: "Meeting" },
    { id: "all-day", start: { date: "2026-11-02" }, end: { date: "2026-11-04" } },
    { id: "cancelled", status: "cancelled", start: { date: "2026-11-03" } },
  ], formatter, Date.parse("2026-11-01T00:00:00Z"), Date.parse("2026-12-01T00:00:00Z"));
  assert.deepEqual(events.map(({ date, time }) => [date, time]), [["2026-11-02", "10:30"], ["2026-11-02", null], ["2026-11-03", null]]);
  assert.ok(events.every((event) => event.source === "google"));
});
