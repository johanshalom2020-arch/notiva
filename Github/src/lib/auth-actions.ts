"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession, requireUser } from "./session";
import { ensureSeed } from "./queries";

export type AuthState = { error?: string } | undefined;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (process.env.DISABLE_SIGNUPS === "1") {
    return { error: "Sign ups are currently disabled on this deployment." };
  }
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Please tell us your name." };
  if (!EMAIL_RE.test(email)) return { error: "That email address doesn't look right." };
  if (password.length < 6) return { error: "Your password needs at least 6 characters." };

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return { error: "That email is already registered — try signing in instead." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ email, displayName: name, passwordHash })
    .returning();

  await ensureSeed(user.id);
  await createSession(user.id);
  redirect("/app");
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_RE.test(email)) return { error: "That email address doesn't look right." };
  if (!password) return { error: "Enter your password." };

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user) return { error: "No account found for that email — create one below." };

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Incorrect password. Try again." };

  await createSession(user.id);
  redirect("/app");
}

export async function signOutAction() {
  await destroySession();
  redirect("/login");
}

export async function updateNameAction(name: string) {
  const user = await requireUser();
  const displayName = name.trim().slice(0, 60) || user.displayName;
  await db
    .update(users)
    .set({ displayName, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  revalidatePath("/app", "layout");
  return { displayName };
}
