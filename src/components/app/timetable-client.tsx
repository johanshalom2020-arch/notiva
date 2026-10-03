"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  createTimetableEntryAction,
  deleteTimetableEntryAction,
  toggleTimetableExceptionAction,
  updateTimetableEntryAction,
} from "@/lib/actions";

type SubjectOption = { id: string; name: string; color: string };

type EntryRow = {
  id: string;
  subjectId: string | null;
  subjectName: string | null;
  subjectColor: string | null;
  title: string;
  dayOfWeek: number; // 0 = Sun .. 6 = Sat
  startTime: string; // "HH:MM"
  endTime: string;
  room: string;
  color: string;
  termStart: string | null; // "YYYY-MM-DD"
  termEnd: string | null;
};

type ExceptionRow = { id: string; entryId: string; date: string };

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const COLORS = ["#7c3aed", "#db2777", "#16a34a", "#ea580c", "#0891b2", "#64748b"];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayKey() {
  return toKey(new Date());
}

function addDays(key: string, delta: number) {
  const d = fromKey(key);
  d.setDate(d.getDate() + delta);
  return toKey(d);
}

function startOfWeek(key: string) {
  const d = fromKey(key);
  d.setDate(d.getDate() - d.getDay());
  return toKey(d);
}

function formatTime(time: string) {
  const [hh, mm] = time.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${pad(mm)} ${period}`;
}

type FormState = {
  id: string | null;
  mode: "subject" | "custom";
  subjectId: string;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  color: string;
  useTermDates: boolean;
  termStart: string;
  termEnd: string;
};

function emptyForm(dayOfWeek: number, dateKey: string): FormState {
  return {
    id: null,
    mode: "custom",
    subjectId: "",
    title: "",
    dayOfWeek,
    startTime: "09:00",
    endTime: "10:00",
    room: "",
    color: COLORS[0],
    useTermDates: false,
    termStart: dateKey,
    termEnd: "",
  };
}

export function TimetableClient({
  initialEntries,
  initialExceptions,
  subjects,
}: {
  initialEntries: EntryRow[];
  initialExceptions: ExceptionRow[];
  subjects: SubjectOption[];
}) {
  const [entries, setEntries] = useState<EntryRow[]>(initialEntries);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>(initialExceptions);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const dayOfWeek = fromKey(selectedDate).getDay();

  const weekDates = useMemo(() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [selectedDate]);

  const exceptionDates = useMemo(() => {
    const set = new Set<string>();
    for (const ex of exceptions) set.add(`${ex.entryId}|${ex.date}`);
    return set;
  }, [exceptions]);

  const dayEntries = useMemo(() => {
    return entries
      .filter((e) => e.dayOfWeek === dayOfWeek)
      .filter((e) => !e.termStart || e.termStart <= selectedDate)
      .filter((e) => !e.termEnd || e.termEnd >= selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [entries, dayOfWeek, selectedDate]);

  function openNew() {
    setForm(emptyForm(dayOfWeek, selectedDate));
  }

  function openEdit(entry: EntryRow) {
    setForm({
      id: entry.id,
      mode: entry.subjectId ? "subject" : "custom",
      subjectId: entry.subjectId ?? "",
      title: entry.title,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room,
      color: entry.color,
      useTermDates: Boolean(entry.termStart || entry.termEnd),
      termStart: entry.termStart ?? "",
      termEnd: entry.termEnd ?? "",
    });
  }

  async function handleSave() {
    if (!form) return;
    if (form.mode === "subject" && !form.subjectId) return;
    if (form.mode === "custom" && !form.title.trim()) return;

    setSaving(true);
    const chosenSubject = subjects.find((s) => s.id === form.subjectId);
    const payload = {
      subjectId: form.mode === "subject" ? form.subjectId : null,
      title: form.mode === "custom" ? form.title.trim() : "",
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      room: form.room,
      color: form.color,
      termStart: form.useTermDates && form.termStart ? form.termStart : null,
      termEnd: form.useTermDates && form.termEnd ? form.termEnd : null,
    };

    const optimisticRow: EntryRow = {
      id: form.id ?? "",
      subjectId: payload.subjectId,
      subjectName: chosenSubject?.name ?? null,
      subjectColor: chosenSubject?.color ?? null,
      title: payload.title,
      dayOfWeek: payload.dayOfWeek,
      startTime: payload.startTime,
      endTime: payload.endTime,
      room: payload.room,
      color: payload.color,
      termStart: payload.termStart,
      termEnd: payload.termEnd,
    };

    try {
      if (form.id) {
        const id = form.id;
        setEntries((cur) => cur.map((e) => (e.id === id ? { ...optimisticRow, id } : e)));
        await updateTimetableEntryAction(id, payload);
      } else {
        const created = await createTimetableEntryAction(payload);
        setEntries((cur) => [...cur, { ...optimisticRow, id: created.id }]);
      }
      setForm(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setEntries((cur) => cur.filter((e) => e.id !== id));
    setForm(null);
    await deleteTimetableEntryAction(id);
  }

  async function handleToggleCancel(entryId: string) {
    const key = `${entryId}|${selectedDate}`;
    const isCancelled = exceptionDates.has(key);
    if (isCancelled) {
      setExceptions((cur) => cur.filter((e) => !(e.entryId === entryId && e.date === selectedDate)));
    } else {
      setExceptions((cur) => [...cur, { id: `${entryId}-${selectedDate}`, entryId, date: selectedDate }]);
    }
    await toggleTimetableExceptionAction(entryId, selectedDate);
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-6 md:px-0">
      <div className="rounded-[26px] border border-white/50 bg-white/75 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-950/60 md:p-7">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-[21px] font-extrabold tracking-tight">
            {WEEKDAY_LONG[dayOfWeek]}
            <span className="ml-2 text-[14px] font-semibold text-slate-400">
              {fromKey(selectedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              aria-label="Previous day"
              className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-black/[0.05] dark:text-neutral-400 dark:hover:bg-white/10"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setSelectedDate(todayKey())}
              className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-slate-500 hover:bg-black/[0.05] dark:text-neutral-400 dark:hover:bg-white/10"
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              aria-label="Next day"
              className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-black/[0.05] dark:text-neutral-400 dark:hover:bg-white/10"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* week strip */}
        <div className="mb-5 flex gap-1.5">
          {weekDates.map((d) => {
            const active = d === selectedDate;
            const isToday = d === todayKey();
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 transition ${
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "text-slate-500 hover:bg-black/[0.045] dark:text-neutral-400 dark:hover:bg-white/[0.06]"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {WEEKDAY_SHORT[fromKey(d).getDay()]}
                </span>
                <span
                  className={`grid size-6 place-items-center rounded-full text-[12px] font-bold ${
                    active ? "" : isToday ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]" : ""
                  }`}
                >
                  {fromKey(d).getDate()}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-slate-400">
            Classes
          </p>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12.5px] font-bold text-white hover:opacity-90"
          >
            <Plus size={14} /> Add class
          </button>
        </div>

        {dayEntries.length === 0 && (
          <p className="py-8 text-center text-[13px] text-slate-400">No classes on this day.</p>
        )}

        <div className="space-y-2">
          {dayEntries.map((entry) => {
            const cancelled = exceptionDates.has(`${entry.id}|${selectedDate}`);
            const displayTitle = entry.subjectName ?? entry.title ?? "Untitled";
            const displayColor = entry.subjectColor ?? entry.color;
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                  cancelled
                    ? "bg-slate-50 opacity-60 dark:bg-white/[0.03]"
                    : "bg-black/[0.03] hover:bg-black/[0.05] dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
                }`}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: displayColor }}
                />
                <button onClick={() => openEdit(entry)} className="min-w-0 flex-1 text-left">
                  <span
                    className={`block truncate text-[14px] font-semibold text-slate-800 dark:text-neutral-100 ${
                      cancelled ? "line-through" : ""
                    }`}
                  >
                    {displayTitle}
                  </span>
                  <span className="flex items-center gap-3 text-[11.5px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                    </span>
                    {entry.room && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {entry.room}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => handleToggleCancel(entry.id)}
                  title={cancelled ? "Restore this occurrence" : "Cancel this occurrence"}
                  className={`grid size-8 shrink-0 place-items-center rounded-lg transition ${
                    cancelled
                      ? "text-emerald-500 hover:bg-emerald-500/10"
                      : "text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"
                  }`}
                >
                  {cancelled ? <RotateCcw size={15} /> : <Ban size={15} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* entry form modal */}
      {form && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setForm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] rounded-[24px] border border-white/50 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/95"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-extrabold">{form.id ? "Edit class" : "New class"}</h3>
              <button
                onClick={() => setForm(null)}
                className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-1.5 rounded-full bg-black/[0.045] p-1 dark:bg-white/10">
                <button
                  onClick={() => setForm({ ...form, mode: "subject" })}
                  disabled={subjects.length === 0}
                  className={`flex-1 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition disabled:opacity-40 ${
                    form.mode === "subject"
                      ? "bg-white text-[var(--accent)] shadow dark:bg-neutral-800"
                      : "text-slate-500"
                  }`}
                >
                  Link a subject
                </button>
                <button
                  onClick={() => setForm({ ...form, mode: "custom" })}
                  className={`flex-1 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ${
                    form.mode === "custom"
                      ? "bg-white text-[var(--accent)] shadow dark:bg-neutral-800"
                      : "text-slate-500"
                  }`}
                >
                  Custom
                </button>
              </div>

              {form.mode === "subject" ? (
                <select
                  value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13.5px] font-semibold outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                >
                  <option value="">Select a subject…</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Class title"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[14px] font-semibold outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              )}

              <select
                value={form.dayOfWeek}
                onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              >
                {WEEKDAY_LONG.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
                <span className="text-[12px] text-slate-400">to</span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>

              <input
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                placeholder="Room (optional)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />

              {form.mode === "custom" && (
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
              )}

              <label className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-500 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={form.useTermDates}
                  onChange={(e) => setForm({ ...form, useTermDates: e.target.checked })}
                />
                Limit to a term or semester
              </label>

              {form.useTermDates && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={form.termStart}
                    onChange={(e) => setForm({ ...form, termStart: e.target.value })}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                  <span className="text-[12px] text-slate-400">to</span>
                  <input
                    type="date"
                    value={form.termEnd}
                    onChange={(e) => setForm({ ...form, termEnd: e.target.value })}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] outline-none focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              )}
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
                disabled={saving}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {form.id ? "Save changes" : "Add class"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
