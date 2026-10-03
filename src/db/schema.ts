import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Theme } from "@/lib/theme";

/* ---------------------------------- auth ---------------------------------- */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: jsonb("theme").$type<Theme>().notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------- workspace ------------------------------- */

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled"),
    icon: text("icon").notNull().default("file-text"),
    cover: text("cover"),
    sortOrder: integer("sort_order").notNull().default(0),
    favorite: boolean("favorite").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("pages_user_idx").on(t.userId)],
);

export const blocks = pgTable(
  "blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("text"),
    content: text("content").notNull().default(""),
    checked: boolean("checked").notNull().default(false),
    color: text("color").notNull().default(""),
    bg: text("bg").notNull().default(""),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("blocks_page_idx").on(t.pageId)],
);

/* ---------------------------------- stats --------------------------------- */

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#7c3aed"),
    target: real("target").notNull().default(90),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("subjects_user_idx").on(t.userId)],
);

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    kind: text("kind").notNull().default("sac"),
    score: real("score").notNull().default(0),
    date: text("date").notNull(),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("assessments_subject_idx").on(t.subjectId)],
);

/* --------------------------------- calendar -------------------------------- */

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    notes: text("notes").notNull().default(""),
    // Stored as plain "YYYY-MM-DD" text, same convention as assessments.date —
    // avoids timezone drift since this is a calendar date, not an instant.
    date: text("date").notNull(),
    // "HH:MM" 24-hour, or null for an all-day event.
    time: text("time"),
    color: text("color").notNull().default("#7c3aed"),
    // Minutes before the event's date/time to flag it as an upcoming
    // reminder in the UI. Null = no reminder set for this event.
    remindMinutesBefore: integer("remind_minutes_before"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("events_user_idx").on(t.userId),
    index("events_date_idx").on(t.date),
  ],
);

/* -------------------------------- timetable --------------------------------- */

export const timetableEntries = pgTable(
  "timetable_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Optional link to an existing Subject — reuses that subject's name and
    // color so a timetable entry doesn't have to duplicate them. Null means
    // this entry uses its own title/color instead.
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    title: text("title").notNull().default(""),
    // 0 = Sunday .. 6 = Saturday. Any day is allowed, no weekday restriction.
    dayOfWeek: integer("day_of_week").notNull(),
    // "HH:MM" 24-hour, same convention as events.time.
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    room: text("room").notNull().default(""),
    // Used only when subjectId is null.
    color: text("color").notNull().default("#7c3aed"),
    // Optional term/semester window — the entry only repeats between these
    // two dates (inclusive). Either or both may be null, meaning "always".
    termStart: text("term_start"),
    termEnd: text("term_end"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("timetable_entries_user_idx").on(t.userId),
    index("timetable_entries_day_idx").on(t.dayOfWeek),
  ],
);

export const timetableExceptions = pgTable(
  "timetable_exceptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => timetableEntries.id, { onDelete: "cascade" }),
    // "YYYY-MM-DD" — the single occurrence of the recurring entry to skip,
    // without deleting or modifying the recurring entry itself.
    date: text("date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("timetable_exceptions_entry_idx").on(t.entryId),
    uniqueIndex("timetable_exceptions_entry_date_uq").on(t.entryId, t.date),
  ],
);
