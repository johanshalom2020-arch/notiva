"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  BookMarked,
  Check,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Sigma,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  createAssessmentAction,
  createSubjectAction,
  deleteAssessmentAction,
  deleteSubjectAction,
  updateAssessmentAction,
  updateSubjectAction,
} from "@/lib/actions";
import {
  ASSESSMENT_KINDS,
  SUBJECT_COLORS,
  computeSubjectStats,
  formatDate,
  kindLabel,
  overallStats,
  round1,
  scoreColor,
  todayIso,
  type AssessmentRow,
  type SubjectRow,
} from "@/lib/stats";

const CARD =
  "rounded-[26px] border border-white/50 bg-white/75 backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-950/60";
const INPUT =
  "w-full rounded-xl border border-black/[0.08] bg-white/70 px-3.5 py-2.5 text-[13.5px] font-medium outline-none transition focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-white/10 dark:bg-white/[0.06]";

/* --------------------------------- sparkline ------------------------------- */

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length === 0) {
    return <div className="flex h-10 items-center justify-center text-[11px] font-bold text-slate-300 dark:text-neutral-600">no results yet</div>;
  }
  const w = 100;
  const h = 34;
  const pad = 4;
  const xs = points.map((_, i) =>
    points.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (points.length - 1),
  );
  const ys = points.map((p) => h - pad - (Math.min(100, Math.max(0, p)) / 100) * (h - pad * 2));
  const d = points.map((_, i) => `${i === 0 ? "M" : "L"}${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((_, i) => (
        <circle key={i} cx={xs[i]} cy={ys[i]} r={2.6} fill={color} stroke="white" strokeWidth={1.2} />
      ))}
    </svg>
  );
}

/* ---------------------------------- modal ---------------------------------- */

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4"
    >
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[26px] border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/95 sm:rounded-[26px]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[12px] font-medium text-slate-400 dark:text-neutral-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-black/[0.05] hover:text-slate-700 dark:hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------ subject modal ------------------------------ */

type SubjectDraft = { mode: "create" } | { mode: "edit"; subject: SubjectRow };

function SubjectModal({
  draft,
  onClose,
  onSave,
}: {
  draft: NonNullable<SubjectDraft>;
  onClose: () => void;
  onSave: (subject: SubjectRow) => Promise<void>;
}) {
  const editing = draft.mode === "edit" ? draft.subject : null;
  const [name, setName] = useState(editing?.name ?? "");
  const [color, setColor] = useState(editing?.color ?? SUBJECT_COLORS[0]);
  const [target, setTarget] = useState(editing?.target ?? 85);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      if (editing) {
        await onSave({ ...editing, name: name.trim(), color, target });
      } else {
        const created = await createSubjectAction({ name: name.trim() || "New subject", color, target });
        await onSave({
          id: created.id,
          name: created.name,
          color: created.color,
          target: created.target,
          sortOrder: created.sortOrder,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit subject" : "New subject"}
      subtitle="Subjects group your SACs, exams and assignments."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-5"
      >
        <div>
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
            Subject name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mathematical Methods"
            className={INPUT}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={`grid size-9 place-items-center rounded-full shadow-sm transition hover:scale-110 ${
                  color === c ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-white dark:ring-offset-neutral-900" : ""
                }`}
                style={{ background: c }}
              >
                {color === c && <Check size={14} strokeWidth={3.5} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
            Target score
            <span className="text-[13px] tabular-nums text-slate-600 normal-case tracking-normal dark:text-neutral-300">
              {target}%
            </span>
          </label>
          <input
            type="range"
            min={40}
            max={100}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          type="submit"
          disabled={saving || name.trim() === ""}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3 text-[14px] font-extrabold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {editing ? "Save changes" : "Add subject"}
        </button>
      </form>
    </Modal>
  );
}

/* ---------------------------- assessment modal ----------------------------- */

type AssessmentDraft = { mode: "create" } | { mode: "edit"; row: AssessmentRow };

function AssessmentModal({
  draft,
  subjects,
  defaultSubjectId,
  onClose,
  onCreate,
  onUpdate,
}: {
  draft: NonNullable<AssessmentDraft>;
  subjects: SubjectRow[];
  defaultSubjectId: string | null;
  onClose: () => void;
  onCreate: (row: AssessmentRow) => void;
  onUpdate: (id: string, row: AssessmentRow) => void;
}) {
  const editing = draft.mode === "edit" ? draft.row : null;
  const [subjectId, setSubjectId] = useState(
    editing?.subjectId ?? defaultSubjectId ?? subjects[0]?.id ?? "",
  );
  const [kind, setKind] = useState(editing?.kind ?? "sac");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [score, setScore] = useState(editing?.score ?? 80);
  const [date, setDate] = useState(editing?.date ?? todayIso());
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const valid = subjectId !== "" && title.trim() !== "";

  async function submit() {
    setSaving(true);
    try {
      const subject = subjects.find((s) => s.id === subjectId);
      if (editing) {
        const patch = { subjectId, title: title.trim(), kind, score, date, notes };
        await updateAssessmentAction(editing.id, patch);
        onUpdate(editing.id, {
          ...editing,
          ...patch,
          subjectName: subject?.name ?? editing.subjectName,
          subjectColor: subject?.color ?? editing.subjectColor,
        });
      } else {
        const row = await createAssessmentAction({
          subjectId,
          title: title.trim(),
          kind,
          score,
          date,
          notes,
        });
        onCreate({
          id: row.id,
          subjectId: row.subjectId,
          subjectName: subject?.name ?? "Subject",
          subjectColor: subject?.color ?? "#7c3aed",
          title: row.title,
          kind: row.kind,
          score: row.score,
          date: row.date,
          notes: row.notes,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit result" : "Log a result"}
      subtitle="SACs, exams, tests, assignments — anything with a score."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) void submit();
        }}
        className="space-y-5"
      >
        <div>
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
            Subject
          </label>
          <div className="flex flex-wrap gap-1.5">
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSubjectId(s.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ring-2 transition ${
                  subjectId === s.id
                    ? "ring-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                    : "ring-black/[0.08] hover:ring-black/20 dark:ring-white/10 dark:hover:ring-white/25"
                }`}
              >
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {s.name}
              </button>
            ))}
            {subjects.length === 0 && (
              <p className="text-[12.5px] font-medium text-rose-500">Add a subject first.</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
            Type
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ASSESSMENT_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold ring-2 transition ${
                  kind === k.id
                    ? "ring-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                    : "ring-black/[0.08] hover:ring-black/20 dark:ring-white/10 dark:hover:ring-white/25"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
            Title
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. SAC 3 — Probability"
            className={INPUT}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
              Score
              <span className="text-[15px] font-extrabold tabular-nums normal-case tracking-normal" style={{ color: scoreColor(score) }}>
                {round1(score)}%
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
              Date
            </label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
            Notes <span className="font-semibold normal-case tracking-normal text-slate-300 dark:text-neutral-600">(optional)</span>
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Lost marks on Q4..."
            className={`${INPUT} resize-none`}
          />
        </div>

        <button
          type="submit"
          disabled={saving || !valid}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3 text-[14px] font-extrabold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
          {editing ? "Save changes" : "Log score"}
        </button>
      </form>
    </Modal>
  );
}

/* ------------------------------ stats page --------------------------------- */

function StatsInner({
  initialSubjects,
  initialAssessments,
}: {
  initialSubjects: SubjectRow[];
  initialAssessments: AssessmentRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subjects, setSubjects] = useState(initialSubjects);
  const [rows, setRows] = useState(initialAssessments);
  const [filter, setFilter] = useState<string>("all");
  const [subjectDraft, setSubjectDraft] = useState<SubjectDraft | null>(null);
  const [assessmentDraft, setAssessmentDraft] = useState<AssessmentDraft | null>(null);
  const [confirmSubject, setConfirmSubject] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<string | null>(null);

  useEffect(() => {
    setSubjects((cur) => (JSON.stringify(cur) === JSON.stringify(initialSubjects) ? cur : initialSubjects));
    setRows((cur) => (JSON.stringify(cur) === JSON.stringify(initialAssessments) ? cur : initialAssessments));
  }, [initialSubjects, initialAssessments]);

  // dashboard quick action: /app/stats?add=score opens the modal
  useEffect(() => {
    if (searchParams.get("add") === "score") {
      setAssessmentDraft({ mode: "create" });
    }
  }, [searchParams]);

  const stats = useMemo(() => computeSubjectStats(subjects, rows), [subjects, rows]);
  const overall = useMemo(() => overallStats(rows), [rows]);

  const filteredRows = useMemo(
    () =>
      rows
        .filter((r) => filter === "all" || r.subjectId === filter)
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [rows, filter],
  );

  const historyRows = useMemo(
    () =>
      rows
        .filter((r) => filter === "all" || r.subjectId === filter)
        .slice()
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .slice(-14),
    [rows, filter],
  );

  const bestSubject = useMemo(() => {
    const withAvg = stats.filter((s) => s.avg != null);
    if (!withAvg.length) return null;
    return withAvg.reduce((a, b) => ((a.avg ?? 0) > (b.avg ?? 0) ? a : b));
  }, [stats]);

  async function removeSubject(id: string) {
    setConfirmSubject(null);
    setSubjects((cur) => cur.filter((s) => s.id !== id));
    setRows((cur) => cur.filter((r) => r.subjectId !== id));
    await deleteSubjectAction(id);
    router.refresh();
  }

  async function removeRow(id: string) {
    setConfirmRow(null);
    setRows((cur) => cur.filter((r) => r.id !== id));
    await deleteAssessmentAction(id);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-[980px] space-y-5">
      {/* header */}
      <header className={`${CARD} flex flex-wrap items-center justify-between gap-4 p-7 shadow-2xl shadow-slate-900/10 md:p-8`}>
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-[var(--accent)] text-white shadow-lg">
            <GraduationCap size={22} />
          </span>
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight md:text-3xl">Statistics</h1>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-400 dark:text-neutral-500">
              Subjects, SAC scores and every result in between.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubjectDraft({ mode: "create" })}
            className="flex items-center gap-1.5 rounded-xl bg-black/[0.05] px-4 py-2.5 text-[12.5px] font-extrabold text-slate-600 transition hover:bg-black/[0.09] dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-white/15"
          >
            <BookMarked size={14} /> Subject
          </button>
          <button
            onClick={() => setAssessmentDraft({ mode: "create" })}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-lg transition hover:brightness-110"
          >
            <Plus size={14} strokeWidth={3} /> Add score
          </button>
        </div>
      </header>

      {/* overview cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Overall average",
            value: overall.avg != null ? `${round1(overall.avg)}%` : "—",
            Icon: Sigma,
            color: overall.avg != null ? scoreColor(overall.avg) : undefined,
          },
          { label: "Results logged", value: String(overall.count), Icon: Award },
          {
            label: "Personal best",
            value: overall.best != null ? `${round1(overall.best)}%` : "—",
            Icon: Target,
          },
          {
            label: "Top subject",
            value: bestSubject?.subject.name ?? "—",
            Icon: GraduationCap,
            small: true,
          },
        ].map((card) => (
          <div key={card.label} className={`${CARD} p-5 shadow-lg shadow-slate-900/5`}>
            <div className="flex items-center justify-between">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-slate-400 dark:text-neutral-500">
                {card.label}
              </p>
              <span className="grid size-7 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]">
                <card.Icon size={14} />
              </span>
            </div>
            <p
              className={`mt-3 truncate font-extrabold tracking-tight ${card.small ? "text-[16px]" : "text-[26px] tabular-nums"}`}
              style={{ color: card.color }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* subject filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-extrabold ring-2 transition ${
            filter === "all"
              ? "ring-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
              : "ring-black/[0.08] hover:ring-black/20 dark:ring-white/10 dark:hover:ring-white/25"
          }`}
        >
          All subjects
        </button>
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilter(filter === s.id ? "all" : s.id)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-extrabold ring-2 transition ${
              filter === s.id
                ? "ring-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                : "ring-black/[0.08] hover:ring-black/20 dark:ring-white/10 dark:hover:ring-white/25"
            }`}
          >
            <span className="size-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </button>
        ))}
      </div>

      {/* subject cards */}
      {subjects.length === 0 ? (
        <div className={`${CARD} p-10 text-center shadow-lg shadow-slate-900/5`}>
          <p className="text-[15px] font-extrabold">No subjects yet</p>
          <p className="mt-1 text-[13px] font-medium text-slate-400">
            Add your first subject, then start logging SAC scores against it.
          </p>
          <button
            onClick={() => setSubjectDraft({ mode: "create" })}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[13px] font-extrabold text-white shadow-lg"
          >
            <Plus size={14} strokeWidth={3} /> Add subject
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {stats
            .filter((s) => filter === "all" || s.subject.id === filter)
            .map((s) => {
              const TrendIcon = (s.trend ?? 0) >= 0 ? TrendingUp : TrendingDown;
              const isConfirming = confirmSubject === s.subject.id;
              const avgPct = s.avg != null ? Math.min(100, s.avg) : 0;
              return (
                <div key={s.subject.id} className={`${CARD} group relative p-6 shadow-lg shadow-slate-900/5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="size-3.5 shrink-0 rounded-full shadow" style={{ background: s.subject.color }} />
                      <h3 className="truncate text-[16px] font-extrabold tracking-tight">{s.subject.name}</h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                      <button
                        onClick={() => setSubjectDraft({ mode: "edit", subject: s.subject })}
                        aria-label="Edit subject"
                        className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-black/[0.05] hover:text-slate-700 dark:hover:bg-white/10"
                      >
                        <Pencil size={13} />
                      </button>
                      {isConfirming ? (
                        <>
                          <button
                            onClick={() => void removeSubject(s.subject.id)}
                            aria-label="Confirm delete"
                            className="grid size-7 place-items-center rounded-lg bg-rose-500 text-white hover:bg-rose-600"
                          >
                            <Check size={13} strokeWidth={3} />
                          </button>
                          <button
                            onClick={() => setConfirmSubject(null)}
                            aria-label="Cancel"
                            className="grid size-7 place-items-center rounded-lg bg-black/5 text-slate-500 hover:bg-black/10 dark:bg-white/10"
                          >
                            <X size={13} strokeWidth={3} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmSubject(s.subject.id)}
                          aria-label="Delete subject"
                          className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-black/[0.05] hover:text-rose-500 dark:hover:bg-white/10"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                      <p
                        className="text-[34px] font-extrabold tabular-nums leading-none tracking-tight"
                        style={{ color: s.avg != null ? scoreColor(s.avg) : undefined }}
                      >
                        {s.avg != null ? `${round1(s.avg)}%` : "—"}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-bold text-slate-400 dark:text-neutral-500">
                        {s.count} result{s.count === 1 ? "" : "s"}
                        {s.trend != null && (
                          <span className="flex items-center gap-0.5" style={{ color: (s.trend ?? 0) >= 0 ? "#10b981" : "#f43f5e" }}>
                            <TrendIcon size={12} />
                            {s.trend >= 0 ? "+" : ""}
                            {round1(s.trend)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="w-32 shrink-0">
                      <Sparkline points={s.items.map((i) => i.score)} color={s.subject.color} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[10.5px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-neutral-500">
                      <span>Toward target</span>
                      <span className="tabular-nums">{round1(avgPct)} / {s.subject.target}%</span>
                    </div>
                    <div className="relative mt-1.5 h-2 overflow-visible rounded-full bg-black/[0.06] dark:bg-white/10">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: s.subject.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${avgPct}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                      <span
                        className="absolute -top-1 h-4 w-[2.5px] rounded-full bg-slate-800/70 dark:bg-white/80"
                        style={{ left: `calc(${s.subject.target}% - 1px)` }}
                        title={`Target ${s.subject.target}%`}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setAssessmentDraft({ mode: "create" })}
                    className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300/80 py-2 text-[12px] font-extrabold text-slate-400 transition hover:border-[var(--accent)] hover:text-[var(--accent)] dark:border-neutral-600"
                  >
                    <Plus size={13} strokeWidth={3} /> Log result
                  </button>
                </div>
              );
            })}
        </div>
      )}

      {/* score history chart */}
      {historyRows.length > 0 && (
        <section className={`${CARD} p-6 shadow-lg shadow-slate-900/5 md:p-7`}>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold tracking-tight">Score history</h2>
            <p className="text-[11px] font-bold text-slate-400 dark:text-neutral-500">
              last {historyRows.length} result{historyRows.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="mt-5 flex h-40 items-end gap-1.5 md:gap-2.5">
            {historyRows.map((r) => (
              <div key={r.id} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                <span className="mb-1 text-[9.5px] font-extrabold tabular-nums text-slate-500 opacity-0 transition group-hover:opacity-100 dark:text-neutral-400">
                  {round1(r.score)}
                </span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(5, r.score)}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-9 rounded-t-lg shadow-sm transition group-hover:brightness-110"
                  style={{ background: r.subjectColor }}
                  title={`${r.title} — ${round1(r.score)}% (${formatDate(r.date)})`}
                />
                <span className="mt-1.5 w-full truncate text-center text-[8.5px] font-bold uppercase tracking-wide text-slate-300 dark:text-neutral-600">
                  {kindLabel(r.kind).slice(0, 4)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* results table */}
      <section className={`${CARD} shadow-lg shadow-slate-900/5`}>
        <div className="flex items-center justify-between px-6 pt-5 md:px-7">
          <h2 className="text-[15px] font-extrabold tracking-tight">All results</h2>
          <p className="text-[11px] font-bold text-slate-400 dark:text-neutral-500">
            {filteredRows.length} shown
          </p>
        </div>
        <div className="space-y-1 p-3 md:p-4">
          {filteredRows.length === 0 && (
            <p className="px-4 py-8 text-center text-[13px] font-medium text-slate-400">
              No results here yet — hit “Add score” to log one.
            </p>
          )}
          {filteredRows.map((r) => {
            const isConfirming = confirmRow === r.id;
            return (
              <div
                key={r.id}
                className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-black/[0.035] dark:hover:bg-white/[0.05]"
              >
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-xl text-[12.5px] font-extrabold tabular-nums text-white shadow"
                  style={{ background: scoreColor(r.score) }}
                >
                  {round1(r.score)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold">{r.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-slate-400 dark:text-neutral-500">
                    <span className="flex items-center gap-1">
                      <span className="size-1.5 rounded-full" style={{ background: r.subjectColor }} />
                      {r.subjectName}
                    </span>
                    <span className="rounded-full bg-black/[0.05] px-1.5 py-px text-[9.5px] font-extrabold uppercase tracking-wide dark:bg-white/10">
                      {kindLabel(r.kind)}
                    </span>
                    <span suppressHydrationWarning>{formatDate(r.date)}</span>
                  </p>
                  {r.notes && <p className="mt-0.5 truncate text-[11px] italic text-slate-400 dark:text-neutral-500">{r.notes}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                  <button
                    onClick={() => setAssessmentDraft({ mode: "edit", row: r })}
                    aria-label="Edit result"
                    className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-black/[0.06] hover:text-slate-700 dark:hover:bg-white/10"
                  >
                    <Pencil size={13} />
                  </button>
                  {isConfirming ? (
                    <>
                      <button
                        onClick={() => void removeRow(r.id)}
                        aria-label="Confirm delete"
                        className="grid size-7 place-items-center rounded-lg bg-rose-500 text-white hover:bg-rose-600"
                      >
                        <Check size={13} strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => setConfirmRow(null)}
                        aria-label="Cancel"
                        className="grid size-7 place-items-center rounded-lg bg-black/5 text-slate-500 hover:bg-black/10 dark:bg-white/10"
                      >
                        <X size={13} strokeWidth={3} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmRow(r.id)}
                      aria-label="Delete result"
                      className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-black/[0.06] hover:text-rose-500 dark:hover:bg-white/10"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* modals */}
      <AnimatePresence>
        {subjectDraft && (
          <SubjectModal
            key="subject-modal"
            draft={subjectDraft}
            onClose={() => setSubjectDraft(null)}
            onSave={async (subject) => {
              if (subjectDraft.mode === "edit") {
                await updateSubjectAction(subject.id, {
                  name: subject.name,
                  color: subject.color,
                  target: subject.target,
                });
                setSubjects((cur) => cur.map((s) => (s.id === subject.id ? subject : s)));
                setRows((cur) =>
                  cur.map((r) =>
                    r.subjectId === subject.id
                      ? { ...r, subjectName: subject.name, subjectColor: subject.color }
                      : r,
                  ),
                );
              } else {
                setSubjects((cur) => [...cur, subject]);
              }
              router.refresh();
            }}
          />
        )}
        {assessmentDraft && (
          <AssessmentModal
            key="assessment-modal"
            draft={assessmentDraft}
            subjects={subjects}
            defaultSubjectId={filter === "all" ? null : filter}
            onClose={() => setAssessmentDraft(null)}
            onCreate={(row) => {
              setRows((cur) => [...cur, row]);
              router.refresh();
            }}
            onUpdate={(id, row) => {
              setRows((cur) => cur.map((r) => (r.id === id ? row : r)));
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function StatsClient(props: {
  initialSubjects: SubjectRow[];
  initialAssessments: AssessmentRow[];
}) {
  return (
    <Suspense>
      <StatsInner {...props} />
    </Suspense>
  );
}
