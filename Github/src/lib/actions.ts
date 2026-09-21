"use server";

import { db } from "@/db";
import { assessments, blocks, pages, subjects, userSettings } from "@/db/schema";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "./session";
import type { Theme } from "./theme";

function ownedPagesSubquery(userId: string) {
  return db.select({ id: pages.id }).from(pages).where(eq(pages.userId, userId));
}

function ownedSubjectsSubquery(userId: string) {
  return db.select({ id: subjects.id }).from(subjects).where(eq(subjects.userId, userId));
}

async function assertPageOwner(pageId: string, userId: string) {
  const rows = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.userId, userId)))
    .limit(1);
  if (rows.length === 0) throw new Error("Page not found");
}

async function assertSubjectOwner(subjectId: string, userId: string) {
  const rows = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId)))
    .limit(1);
  if (rows.length === 0) throw new Error("Subject not found");
}

/* ---------------------------------- pages --------------------------------- */

export async function createPageAction(partial?: { title?: string; icon?: string }) {
  const user = await requireUser();
  const [max] = await db
    .select({ value: sql<number>`coalesce(max(${pages.sortOrder}), -1)` })
    .from(pages)
    .where(eq(pages.userId, user.id));
  const [page] = await db
    .insert(pages)
    .values({
      userId: user.id,
      title: partial?.title ?? "Untitled",
      icon: partial?.icon ?? "fileText",
      sortOrder: (max?.value ?? -1) + 1,
    })
    .returning();
  revalidatePath("/app", "layout");
  return page;
}

export async function updatePageAction(
  id: string,
  patch: Partial<{
    title: string;
    icon: string;
    cover: string | null;
    favorite: boolean;
    sortOrder: number;
  }>,
) {
  const user = await requireUser();
  await db
    .update(pages)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(pages.id, id), eq(pages.userId, user.id)));
  revalidatePath("/app", "layout");
}

export async function deletePageAction(id: string) {
  const user = await requireUser();
  await db.delete(pages).where(and(eq(pages.id, id), eq(pages.userId, user.id)));
  revalidatePath("/app", "layout");
}

/* ---------------------------------- blocks -------------------------------- */

export async function createBlockAction(
  pageId: string,
  opts?: { type?: string; content?: string; color?: string; bg?: string; position?: number },
) {
  const user = await requireUser();
  await assertPageOwner(pageId, user.id);

  let position = opts?.position;
  if (position == null) {
    const [max] = await db
      .select({ value: sql<number>`coalesce(max(${blocks.position}), -1)` })
      .from(blocks)
      .where(eq(blocks.pageId, pageId));
    position = (max?.value ?? -1) + 1;
  } else {
    await db
      .update(blocks)
      .set({ position: sql`${blocks.position} + 1` })
      .where(and(eq(blocks.pageId, pageId), gte(blocks.position, position)));
  }
  const [block] = await db
    .insert(blocks)
    .values({
      pageId,
      type: opts?.type ?? "text",
      content: opts?.content ?? "",
      color: opts?.color ?? "",
      bg: opts?.bg ?? "",
      position,
    })
    .returning();
  return block;
}

export async function updateBlockAction(
  id: string,
  patch: Partial<{
    content: string;
    type: string;
    checked: boolean;
    color: string;
    bg: string;
  }>,
) {
  const user = await requireUser();
  await db
    .update(blocks)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(blocks.id, id), inArray(blocks.pageId, ownedPagesSubquery(user.id))));
  if (patch.checked !== undefined) {
    revalidatePath("/app/tasks");
  }
}

export async function deleteBlockAction(id: string) {
  const user = await requireUser();
  await db
    .delete(blocks)
    .where(and(eq(blocks.id, id), inArray(blocks.pageId, ownedPagesSubquery(user.id))));
}

export async function reorderBlocksAction(pageId: string, orderedIds: string[]) {
  const user = await requireUser();
  await assertPageOwner(pageId, user.id);
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(blocks)
        .set({ position: i })
        .where(and(eq(blocks.id, orderedIds[i]), eq(blocks.pageId, pageId)));
    }
  });
}

export async function toggleTodoAction(id: string, checked: boolean) {
  const user = await requireUser();
  await db
    .update(blocks)
    .set({ checked, updatedAt: new Date() })
    .where(and(eq(blocks.id, id), inArray(blocks.pageId, ownedPagesSubquery(user.id))));
  revalidatePath("/app/tasks");
}

/* ---------------------------- subjects & scores ---------------------------- */

export async function createSubjectAction(data: {
  name: string;
  color: string;
  target: number;
}) {
  const user = await requireUser();
  const [max] = await db
    .select({ value: sql<number>`coalesce(max(${subjects.sortOrder}), -1)` })
    .from(subjects)
    .where(eq(subjects.userId, user.id));
  const [subject] = await db
    .insert(subjects)
    .values({
      userId: user.id,
      name: data.name.trim() || "New subject",
      color: data.color,
      target: Math.min(100, Math.max(0, data.target)),
      sortOrder: (max?.value ?? -1) + 1,
    })
    .returning();
  revalidatePath("/app");
  revalidatePath("/app/stats");
  return subject;
}

export async function updateSubjectAction(
  id: string,
  patch: Partial<{ name: string; color: string; target: number }>,
) {
  const user = await requireUser();
  await db
    .update(subjects)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(subjects.id, id), eq(subjects.userId, user.id)));
  revalidatePath("/app");
  revalidatePath("/app/stats");
}

export async function deleteSubjectAction(id: string) {
  const user = await requireUser();
  await db.delete(subjects).where(and(eq(subjects.id, id), eq(subjects.userId, user.id)));
  revalidatePath("/app");
  revalidatePath("/app/stats");
}

export async function createAssessmentAction(data: {
  subjectId: string;
  title: string;
  kind: string;
  score: number;
  date: string;
  notes?: string;
}) {
  const user = await requireUser();
  await assertSubjectOwner(data.subjectId, user.id);
  const [row] = await db
    .insert(assessments)
    .values({
      subjectId: data.subjectId,
      title: data.title.trim() || "Untitled assessment",
      kind: data.kind || "sac",
      score: Math.min(100, Math.max(0, data.score)),
      date: data.date || new Date().toISOString().slice(0, 10),
      notes: data.notes ?? "",
    })
    .returning();
  revalidatePath("/app");
  revalidatePath("/app/stats");
  return row;
}

export async function updateAssessmentAction(
  id: string,
  patch: Partial<{
    subjectId: string;
    title: string;
    kind: string;
    score: number;
    date: string;
    notes: string;
  }>,
) {
  const user = await requireUser();
  if (patch.subjectId) {
    await assertSubjectOwner(patch.subjectId, user.id);
  }
  const safe = { ...patch } as Record<string, unknown>;
  if (patch.score !== undefined) {
    safe.score = Math.min(100, Math.max(0, patch.score));
  }
  await db
    .update(assessments)
    .set({ ...safe, updatedAt: new Date() })
    .where(and(eq(assessments.id, id), inArray(assessments.subjectId, ownedSubjectsSubquery(user.id))));
  revalidatePath("/app");
  revalidatePath("/app/stats");
}

export async function deleteAssessmentAction(id: string) {
  const user = await requireUser();
  await db
    .delete(assessments)
    .where(and(eq(assessments.id, id), inArray(assessments.subjectId, ownedSubjectsSubquery(user.id))));
  revalidatePath("/app");
  revalidatePath("/app/stats");
}

/* ------------------------------ quick actions ------------------------------ */

export async function createListPageAction(kind: "todo" | "bullet" | "blank") {
  const user = await requireUser();
  const [max] = await db
    .select({ value: sql<number>`coalesce(max(${pages.sortOrder}), -1)` })
    .from(pages)
    .where(eq(pages.userId, user.id));
  const title =
    kind === "todo" ? "To-Do List" : kind === "bullet" ? "Untitled List" : "Untitled";
  const icon = kind === "todo" ? "listTodo" : kind === "bullet" ? "list" : "fileText";
  const [page] = await db
    .insert(pages)
    .values({ userId: user.id, title, icon, sortOrder: (max?.value ?? -1) + 1 })
    .returning();

  if (kind !== "blank") {
    await db.insert(blocks).values(
      Array.from({ length: 4 }).map((_, i) => ({
        pageId: page.id,
        type: kind,
        content: "",
        position: i,
      })),
    );
  } else {
    await db.insert(blocks).values({ pageId: page.id, type: "text", content: "", position: 0 });
  }
  revalidatePath("/app", "layout");
  return page;
}

/* --------------------------------- settings ------------------------------- */

export async function saveThemeAction(theme: Theme) {
  const user = await requireUser();
  await db
    .insert(userSettings)
    .values({ userId: user.id, theme, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { theme, updatedAt: new Date() },
    });
  revalidatePath("/app", "layout");
}
