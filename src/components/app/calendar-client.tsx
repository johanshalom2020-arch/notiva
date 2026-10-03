"use client";

import { useMemo, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  createEventAction,
  deleteEventAction,
  importEventsAction,
  updateEventAction,
} from "@/lib/actions";

type EventRow = {
  id: string;
  title: string;
  notes: string;
  date: string; // "YYYY-MM-DD"
  time: string | null; // "HH:MM" or null for all-day
  color: string;
  remindMinutesBefore: number | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const COLORS = ["#7c3aed", "#db2777", "#16a34a", "#ea580c", "#0891b2", "#64748b"];

const REMINDER_OPTIONS: { label: string; value: number | null }[] = [
  { label: "No reminder", value: null },
  { label: "At time of event", value: 0 },
  { label: "15 minutes before", value: 15 },
  { label: "1 hour before", value: 60 },
  { label: "1 day before", value: 1440 },
];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function todayKey() {
  const t = new Date();
  return toKey(t.getFullYear(), t.getMonth(), t.getDate());
}

type Cell = { key: string; day: number; inMonth: boolean };

function buildMonth(year: number, month: number): Cell[][] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: Cell[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const m = month - 1 < 0 ? 11 : month - 1;
    const y = month - 1 < 0 ? year - 1 : year;
    cells.push({ key: toKey(y, m, day), day, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ key: toKey(year, month, day), day, inMonth: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1];
    const [ly, lm, ld] = last.key.split("-").map(Number);
    const nextDate = new Date(ly, lm - 1, ld + 1);
    cells.push({
      key: toKey(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()),
      day: nextDate.getDate(),
      inMonth: false,
    });
  }
  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function eventDateTime(ev: EventRow) {
  const [y, m, d] = ev.date.split("-").map(Number);
  if (ev.time) {
    const [hh, mm] = ev.time.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm);
  }
  return new Date(y, m - 1, d, 0, 0);
}

function formatTime(time: string) {
  const [hh, mm] = time.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${pad(mm)} ${period}`;
}

type FormState = {
  id: string | null;
  title: string;
  date: string;
  time: string;
  allDay: boolean;
  notes: string;
  color: string;
  remindMinutesBefore: number | null;
};

function emptyForm(date: string): FormState {
  return {
    id: null,
    title: "",
    date,
    time: "09:00",
    allDay: true,
    notes: "",
    color: COLORS[0],
    remindMinutesBefore: null,
  };
}

/**
 * Minimal iCalendar (.ics) parser — handles the common VEVENT fields
 * (SUMMARY, DTSTART, DTEND, DESCRIPTION) from files exported by Google
 * Calendar, Outlook, Apple Calendar, and most school/university portals.
 *
 * Known limitations, kept intentionally simple rather than silently wrong:
 *  - Recurring events (RRULE) are imported as a single occurrence on their
 *    DTSTART date only — the recurrence rule itself isn't expanded.
 *  - Timed events are read as local wall-clock time; a trailing "Z" (UTC)
 *    on the timestamp is stripped rather than converted, so times from a
 *    calendar in a very different timezone may be off by a few hours.
 */
function parseIcs(text: string): { title: string; date: string; time: string | null; notes: string }[] {
  // Unfold RFC 5545 continuation lines (a line starting with a space or tab
  // is a continuation of the previous line).
  const unfolded = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const lines = unfolded.split("\n");

  const results: { title: string; date: string; time: string | null; notes: string }[] = [];
  let inEvent = false;
  let title = "";
  let notes = "";
  let date: string | null = null;
  let time: string | null = null;

  function unescapeText(v: string) {
    return v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
  }

  function parseDateValue(raw: string) {
    const value = raw.replace(/Z$/, "");
    const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
    if (!m) return;
    const [, y, mo, d, hh, mm] = m;
    date = `${y}-${mo}-${d}`;
    time = hh && mm ? `${hh}:${mm}` : null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      title = "";
      notes = "";
      date = null;
      time = null;
      continue;
    }
    if (line === "END:VEVENT") {
      if (inEvent && date) {
        results.push({ title: title || "Untitled event", date, time, notes });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const rawKey = line.slice(0, colonIndex);
    const value = line.slice(colonIndex + 1);
    const key = rawKey.split(";")[0].toUpperCase();

    if (key === "SUMMARY") title = unescapeText(value);
    else if (key === "DESCRIPTION") notes = unescapeText(value);
    else if (key === "DTSTART") parseDateValue(value);
  }

  return results;
}

export function CalendarClient({ initialEvents }: { initialEvents: EventRow[] }) {
  const [events, setEvents] = useState<EventRow[]>(initialEvents);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string>(todayKey());
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const weeks = useMemo(() => buildMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const ev of events) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
    }
    return map;
  }, [events]);

  const selectedEvents = eventsByDate.get(selected) ?? [];

  const upcoming = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => e.remindMinutesBefore !== null)
      .map((e) => ({ e, at: eventDateTime(e) }))
      .filter(({ at }) => at.getTime() >= now.getTime() - 24 * 3600000)
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .slice(0, 6);
  }, [events]);

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setImporting(true);
    setImportMessage(null);
    try {
      const text = await file.text();
      const parsed = parseIcs(text);
      if (parsed.length === 0) {
        setImportMessage("No events found in that file.");
        return;
      }
      const toInsert = parsed.map((p, i) => ({
        title: p.title,
        date: p.date,
        time: p.time,
        notes: p.notes,
        color: COLORS[i % COLORS.length],
      }));
      const created = await importEventsAction(toInsert);
      setEvents((cur) => [...cur, ...(created as EventRow[])]);
      setImportMessage(`Imported ${created.length} event${created.length === 1 ? "" : "s"}.`);
    } catch {
      setImportMessage("Couldn't read that file — make sure it's a .ics calendar export.");
    } finally {
      setImporting(false);
    }
  }

  function goToday() {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelected(todayKey());
  }

  function shiftMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  function openNew(dateKey: string) {
    setForm(emptyForm(dateKey));
  }

  function openEdit(ev: EventRow) {
    setForm({
      id: ev.id,
      title: ev.title,
      date: ev.date,
      time: ev.time ?? "09:00",
      allDay: !ev.time,
      notes: ev.notes,
      color: ev.color,
      remindMinutesBefore: ev.remindMinutesBefore,
    });
  }

  async function handleSave() {
    if (!form || !form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      date: form.date,
      time: form.allDay ? null : form.time,
      notes: form.notes,
      color: form.color,
      remindMinutesBefore: form.remindMinutesBefore,
    };
    try {
      if (form.id) {
        const id = form.id;
        setEvents((cur) => cur.map((e) => (e.id === id ? { ...e, ...payload } : e)));
        await updateEventAction(id, payload);
      } else {
        const created = await createEventAction(payload);
        setEvents((cur) => [...cur, created as EventRow]);
      }
      setForm(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setEvents((cur) => cur.filter((e) => e.id !== id));
    setForm(null);
    await deleteEventAction(id);
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-6 md:px-0">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* month grid */}
        <div className="flex-1 rounded-[26px] border border-white/50 bg-white/75 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-950/60 md:p-7">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_14%,white)] text-[var(--accent)] dark:bg-[color-mix(in_srgb,var(--accent)_20%,black)]">
                <CalendarDays size={19} />
              </span>
              <h1 className="text-[21px] font-extrabold tracking-tight">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".ics,text/calendar"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                title="Import a .ics calendar file"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-slate-500 hover:bg-black/[0.05] disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-white/10"
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Import
              </button>
              <span className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />
              <button
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-black/[0.05] dark:text-neutral-400 dark:hover:bg-white/10"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goToday}
                className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-slate-500 hover:bg-black/[0.05] dark:text-neutral-400 dark:hover:bg-white/10"
              >
                Today
              </button>
              <button
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-black/[0.05] dark:text-neutral-400 dark:hover:bg-white/10"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {importMessage && (
            <p className="-mt-3 mb-4 text-[12px] font-medium text-slate-500 dark:text-neutral-400">
              {importMessage}
            </p>
          )}

          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="pb-1 text-center text-[10.5px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-neutral-500"
              >
                {w}
              </div>
            ))}
            {weeks.flat().map((cell) => {
              const dayEvents = eventsByDate.get(cell.key) ?? [];
              const isToday = cell.key === todayKey();
              const isSelected = cell.key === selected;
              return (
                <button
                  key={cell.key}
                  onClick={() => setSelected(cell.key)}
                  className={`flex min-h-[76px] flex-col items-start gap-1 rounded-xl p-1.5 text-left transition ${
                    isSelected
                      ? "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] ring-2 ring-[var(--accent)]"
                      : "hover:bg-black/[0.035] dark:hover:bg-white/[0.05]"
                  } ${cell.inMonth ? "" : "opacity-40"}`}
                >
                  <span
                    className={`grid size-6 place-items-center rounded-full text-[12px] font-bold ${
                      isToday ? "bg-[var(--accent)] text-white" : "text-slate-600 dark:text-neutral-300"
                    }`}
                  >
                    {cell.day}
                  </span>
                  <div className="flex w-full flex-col gap-0.5">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <span
                        key={ev.id}
                        className="truncate rounded px-1 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: ev.color }}
                      >
                        {ev.title || "Untitled"}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* side panel */}
        <div className="w-full space-y-5 lg:w-[340px]">
          <div className="rounded-[24px] border border-white/50 bg-white/75 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-950/60">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold">
                {new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <button
                onClick={() => openNew(selected)}
                aria-label="Add event"
                className="grid size-8 place-items-center rounded-lg bg-[var(--accent)] text-white hover:opacity-90"
              >
                <Plus size={15} />
              </button>
            </div>

            {selectedEvents.length === 0 && (
              <p className="py-4 text-center text-[12.5px] text-slate-400">No events yet.</p>
            )}

            <div className="space-y-2">
              {selectedEvents.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => openEdit(ev)}
                  className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-black/[0.035] dark:hover:bg-white/[0.05]"
                >
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: ev.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-slate-800 dark:text-neutral-100">
                      {ev.title || "Untitled"}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      {ev.time ? (
                        <>
                          <Clock size={10} /> {formatTime(ev.time)}
                        </>
                      ) : (
                        "All day"
                      )}
                      {ev.remindMinutesBefore !== null && (
                        <Bell size={10} className="text-amber-500" />
                      )}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/50 bg-white/75 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-950/60">
            <p className="mb-3 flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-widest text-slate-400">
              <Bell size={12} /> Upcoming reminders
            </p>
            {upcoming.length === 0 && (
              <p className="flex items-center gap-1.5 py-2 text-[12.5px] text-slate-400">
                <BellOff size={13} /> Nothing coming up.
              </p>
            )}
            <div className="space-y-2">
              {upcoming.map(({ e, at }) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setViewYear(at.getFullYear());
                    setViewMonth(at.getMonth());
                    setSelected(e.date);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-black/[0.035] dark:hover:bg-white/[0.05]"
                >
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-slate-700 dark:text-neutral-200">
                    {e.title || "Untitled"}
                  </span>
                  <span className="shrink-0 text-[11px] font-medium text-slate-400">
                    {at.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* event form modal */}
      {form && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setForm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-[24px] border border-white/50 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/95"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-extrabold">{form.id ? "Edit event" : "New event"}</h3>
              <button
                onClick={() => setForm(null)}
                className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Event title"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[14px] font-semibold outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
                <label className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500 dark:text-neutral-400">
                  <input
                    type="checkbox"
                    checked={form.allDay}
                    onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
                  />
                  All day
                </label>
              </div>

              {!form.allDay && (
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              )}

              <select
                value={form.remindMinutesBefore === null ? "none" : String(form.remindMinutesBefore)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    remindMinutesBefore: e.target.value === "none" ? null : Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              >
                {REMINDER_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value === null ? "none" : opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes (optional)"
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />

              <div className="flex gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={`size-7 rounded-full ring-2 transition ${
                      form.color === c ? "ring-[var(--accent)]" : "ring-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              {form.id ? (
                <button
                  onClick={() => handleDelete(form.id!)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-rose-500 hover:bg-rose-500/10"
                >
                  <Trash2 size={14} /> Delete
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {form.id ? "Save changes" : "Add event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
