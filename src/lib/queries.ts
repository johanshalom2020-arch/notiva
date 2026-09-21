import { db } from "@/db";
import { assessments, blocks, pages, subjects, userSettings } from "@/db/schema";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { DEFAULT_THEME, type Theme } from "./theme";
import type { AssessmentRow, SubjectRow } from "./stats";

/* --------------------------------- workspace ------------------------------- */

export async function getPages(userId: string) {
  return db
    .select()
    .from(pages)
    .where(eq(pages.userId, userId))
    .orderBy(asc(pages.sortOrder), asc(pages.createdAt));
}

export async function getPage(id: string, userId: string) {
  const rows = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, id), eq(pages.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getBlocks(pageId: string) {
  return db
    .select()
    .from(blocks)
    .where(eq(blocks.pageId, pageId))
    .orderBy(asc(blocks.position));
}

export async function getTheme(userId: string): Promise<Theme> {
  const rows = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return { ...DEFAULT_THEME, ...(rows[0]?.theme ?? {}) };
}

export async function getAllTodos(userId: string) {
  const rows = await db
    .select({
      id: blocks.id,
      pageId: blocks.pageId,
      pageTitle: pages.title,
      pageIcon: pages.icon,
      content: blocks.content,
      checked: blocks.checked,
      position: blocks.position,
    })
    .from(blocks)
    .innerJoin(pages, eq(blocks.pageId, pages.id))
    .where(and(eq(blocks.type, "todo"), eq(pages.userId, userId)))
    .orderBy(asc(pages.sortOrder), asc(blocks.position));

  const groups = new Map<
    string,
    { pageId: string; pageTitle: string; pageIcon: string; items: { id: string; content: string; checked: boolean }[] }
  >();
  for (const row of rows) {
    if (!groups.has(row.pageId)) {
      groups.set(row.pageId, {
        pageId: row.pageId,
        pageTitle: row.pageTitle,
        pageIcon: row.pageIcon,
        items: [],
      });
    }
    groups.get(row.pageId)!.items.push({ id: row.id, content: row.content, checked: row.checked });
  }
  return Array.from(groups.values());
}

/* --------------------------------- statistics ------------------------------ */

export async function getSubjects(userId: string): Promise<SubjectRow[]> {
  const rows = await db
    .select()
    .from(subjects)
    .where(eq(subjects.userId, userId))
    .orderBy(asc(subjects.sortOrder), asc(subjects.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    target: r.target,
    sortOrder: r.sortOrder,
  }));
}

export async function getAssessments(userId: string): Promise<AssessmentRow[]> {
  return db
    .select({
      id: assessments.id,
      subjectId: assessments.subjectId,
      subjectName: subjects.name,
      subjectColor: subjects.color,
      title: assessments.title,
      kind: assessments.kind,
      score: assessments.score,
      date: assessments.date,
      notes: assessments.notes,
    })
    .from(assessments)
    .innerJoin(subjects, eq(assessments.subjectId, subjects.id))
    .where(eq(subjects.userId, userId))
    .orderBy(asc(assessments.date), asc(assessments.createdAt));
}

export async function getRecentPages(userId: string, limit = 6) {
  return db
    .select()
    .from(pages)
    .where(eq(pages.userId, userId))
    .orderBy(desc(pages.updatedAt))
    .limit(limit);
}

export async function getCounts(userId: string) {
  const [pageCount] = await db
    .select({ value: count() })
    .from(pages)
    .where(eq(pages.userId, userId));
  const [subjectCount] = await db
    .select({ value: count() })
    .from(subjects)
    .where(eq(subjects.userId, userId));
  const [assessmentCount] = await db
    .select({ value: count() })
    .from(assessments)
    .innerJoin(subjects, eq(assessments.subjectId, subjects.id))
    .where(eq(subjects.userId, userId));
  return {
    pages: pageCount?.value ?? 0,
    subjects: subjectCount?.value ?? 0,
    assessments: assessmentCount?.value ?? 0,
  };
}

/* ---------------------------------- seeding -------------------------------- */

type SeedBlock = { type: string; content?: string; checked?: boolean };

async function insertSeedPage(
  userId: string,
  title: string,
  icon: string,
  sortOrder: number,
  seedBlocks: SeedBlock[],
  cover?: string,
) {
  const [page] = await db
    .insert(pages)
    .values({ userId, title, icon, sortOrder, cover: cover ?? null })
    .returning();
  if (seedBlocks.length > 0) {
    await db.insert(blocks).values(
      seedBlocks.map((b, i) => ({
        pageId: page.id,
        type: b.type,
        content: b.content ?? "",
        checked: b.checked ?? false,
        position: i,
      })),
    );
  }
  return page;
}

/**
 * Every user gets a fully-seeded workspace on first load/sign-up:
 * a Welcome page, a To-Do List, a Lists page and a starter gradebook.
 * Idempotent — checks for existing rows for THIS user before inserting.
 */
export async function ensureSeed(userId: string) {
  const existing = await db
    .select({ value: count() })
    .from(pages)
    .where(eq(pages.userId, userId));

  if ((existing[0]?.value ?? 0) === 0) {
    await insertSeedPage(userId, "Welcome", "sparkles", 0, [
      { type: "h1", content: "Welcome to Notiva" },
      {
        type: "callout",
        content:
          "This is your vibrant new workspace. Type / in any block to change its kind, drag the handle on the left to reorder, and open Customize to repaint every pixel.",
      },
      {
        type: "text",
        content:
          "Create pages from the sidebar and fill them with text, headings, to-dos, lists, quotes and callouts. Everything saves instantly to your account.",
      },
      { type: "h2", content: "Quick tips" },
      { type: "bullet", content: "Press Enter to add a block — it keeps the list going" },
      { type: "bullet", content: "Type / to turn a block into anything else" },
      { type: "bullet", content: "Every to-do you make also shows up under All Tasks" },
      { type: "todo", content: "Open your new workspace", checked: true },
      { type: "todo", content: "Write your first block", checked: false },
      { type: "todo", content: "Make it yours in Customize", checked: false },
      { type: "divider" },
      { type: "quote", content: "The best workspace is the one that feels unmistakably yours." },
    ]);

    await insertSeedPage(
      userId,
      "To-Do List",
      "listTodo",
      1,
      [
        { type: "callout", content: "Check things off as you go — progress is tracked automatically in All Tasks." },
        { type: "h2", content: "Today" },
        { type: "todo", content: "Morning walk or stretch", checked: true },
        { type: "todo", content: "Reply to important emails", checked: false },
        { type: "todo", content: "Buy groceries for the week", checked: false },
        { type: "todo", content: "Finish the design mockup", checked: false },
        { type: "h2", content: "This week" },
        { type: "todo", content: "Book dentist appointment", checked: false },
        { type: "todo", content: "Plan the weekend trip", checked: false },
        { type: "todo", content: "Read 100 pages of current book", checked: false },
      ],
      "ocean",
    );

    await insertSeedPage(
      userId,
      "My Lists",
      "list",
      2,
      [
        { type: "h2", content: "Movies to watch" },
        { type: "bullet", content: "Dune: Part Two" },
        { type: "bullet", content: "Past Lives" },
        { type: "bullet", content: "Everything Everywhere All at Once" },
        { type: "h2", content: "Places to visit" },
        { type: "numbered", content: "Kyoto" },
        { type: "numbered", content: "Lisbon" },
        { type: "numbered", content: "Reykjavik" },
        { type: "numbered", content: "Cape Town" },
        { type: "h2", content: "Books to read" },
        { type: "bullet", content: "The Creative Act" },
        { type: "bullet", content: "Project Hail Mary" },
        { type: "bullet", content: "Klara and the Sun" },
        { type: "quote", content: "A list is memory with structure." },
      ],
      "grape",
    );
  }

  // Starter gradebook — only seeded once, the very first time this user
  // ever loads the stats page. We track this with a flag in user_settings
  // so deleting all subjects never re-triggers the seed.
  const settingsRows = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const alreadySeededSubjects =
    (settingsRows[0]?.theme as Record<string, unknown> | null)?.__subjectsSeedDone === true;

  if (alreadySeededSubjects) return;

  // Mark as seeded FIRST so even if the inserts fail we don't loop forever.
  await db
    .insert(userSettings)
    .values({
      userId,
      theme: { __subjectsSeedDone: true } as unknown as import("./theme").Theme,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        theme: sql`user_settings.theme || '{"__subjectsSeedDone":true}'::jsonb`,
        updatedAt: new Date(),
      },
    });

  const day = 24 * 60 * 60 * 1000;
  const daysAgo = (n: number) => new Date(Date.now() - n * day).toISOString().slice(0, 10);

  const seedSubjects: {
    name: string;
    color: string;
    target: number;
    sortOrder: number;
    rows: { title: string; kind: string; score: number; daysAgo: number }[];
  }[] = [
    {
      name: "Mathematical Methods",
      color: "#7c3aed",
      target: 90,
      sortOrder: 0,
      rows: [
        { title: "SAC 1 — Functions & Graphs", kind: "sac", score: 88, daysAgo: 21 },
        { title: "SAC 2 — Calculus", kind: "sac", score: 76, daysAgo: 12 },
        { title: "Practice Exam", kind: "exam", score: 91, daysAgo: 4 },
      ],
    },
    {
      name: "English",
      color: "#db2777",
      target: 85,
      sortOrder: 1,
      rows: [
        { title: "SAC 1 — Text Response", kind: "sac", score: 82, daysAgo: 18 },
        { title: "Comparative Essay", kind: "assignment", score: 79, daysAgo: 8 },
      ],
    },
    {
      name: "Biology",
      color: "#16a34a",
      target: 88,
      sortOrder: 2,
      rows: [{ title: "SAC 1 — Cells & Systems", kind: "sac", score: 90, daysAgo: 15 }],
    },
  ];

  for (const s of seedSubjects) {
    const [subject] = await db
      .insert(subjects)
      .values({ userId, name: s.name, color: s.color, target: s.target, sortOrder: s.sortOrder })
      .returning();
    await db.insert(assessments).values(
      s.rows.map((r) => ({
        subjectId: subject.id,
        title: r.title,
        kind: r.kind,
        score: r.score,
        date: daysAgo(r.daysAgo),
        notes: "",
      })),
    );
  }
}
