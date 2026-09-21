"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Award,
  GraduationCap,
  List,
  ListChecks,
  ListTodo,
  Loader2,
  NotebookPen,
  PenLine,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { createListPageAction, toggleTodoAction } from "@/lib/actions";
import { getPageIcon } from "@/lib/icons";
import {
  computeSubjectStats,
  formatDate,
  kindLabel,
  overallStats,
  round1,
  scoreColor,
  type AssessmentRow,
  type SubjectRow,
} from "@/lib/stats";

type Counts = { pages: number; subjects: number; assessments: number };
type RecentPage = { id: string; title: string; icon: string; updatedAt: string };
type TodoItem = { id: string; content: string; checked: boolean };
type TodoGroup = { pageId: string; pageTitle: string; items: TodoItem[] };
type FlatTodo = TodoItem & { pageId: string; pageTitle: string };

const CARD =
  "rounded-[26px] border border-white/50 bg-white/75 backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-950/60";

const QUICK_ACTIONS = [
  {
    id: "todo",
    label: "To-do list",
    hint: "Fresh checklist page",
    Icon: ListTodo,
    gradient: "linear-gradient(135deg,#f59e0b 0%,#f43f5e 55%,#a855f7 100%)",
  },
  {
    id: "bullet",
    label: "List of things",
    hint: "Bullets for anything",
    Icon: List,
    gradient: "linear-gradient(135deg,#06b6d4 0%,#3b82f6 55%,#8b5cf6 100%)",
  },
  {
    id: "sac",
    label: "Add SAC score",
    hint: "Log a result in Statistics",
    Icon: GraduationCap,
    gradient: "linear-gradient(135deg,#8b5cf6 0%,#d946ef 55%,#f472b6 100%)",
  },
  {
    id: "blank",
    label: "Blank page",
    hint: "Start writing from zero",
    Icon: PenLine,
    gradient: "linear-gradient(135deg,#0f172a 0%,#334155 60%,#64748b 100%)",
  },
] as const;

const itemAnim = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

export function DashboardClient({
  displayName,
  counts,
  recentPages,
  todoGroups,
  assessments,
}: {
  displayName: string;
  counts: Counts;
  recentPages: RecentPage[];
  todoGroups: TodoGroup[];
  assessments: AssessmentRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Welcome back");
  const [today, setToday] = useState("");
  const [todos, setTodos] = useState<FlatTodo[]>(() =>
    todoGroups.flatMap((g) =>
      g.items.map((t) => ({ ...t, pageId: g.pageId, pageTitle: g.pageTitle })),
    ),
  );

  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
    setToday(
      now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    );
  }, []);

  useEffect(() => {
    const incoming = todoGroups.flatMap((g) =>
      g.items.map((t) => ({ ...t, pageId: g.pageId, pageTitle: g.pageTitle })),
    );
    setTodos((cur) => (JSON.stringify(cur) === JSON.stringify(incoming) ? cur : incoming));
  }, [todoGroups]);

  const doneCount = todos.filter((t) => t.checked).length;
  const taskPct = todos.length ? Math.round((doneCount / todos.length) * 100) : 100;
  const openTodos = todos.filter((t) => !t.checked).slice(0, 6);

  const overall = useMemo(() => overallStats(assessments), [assessments]);

  const subjectStats = useMemo(() => {
    const map = new Map<string, SubjectRow>();
    for (const a of assessments) {
      if (!map.has(a.subjectId)) {
        map.set(a.subjectId, {
          id: a.subjectId,
          name: a.subjectName,
          color: a.subjectColor,
          target: 0,
          sortOrder: 0,
        });
      }
    }
    return computeSubjectStats(Array.from(map.values()), assessments);
  }, [assessments]);

  const recentScores = useMemo(
    () =>
      assessments
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 5),
    [assessments],
  );

  async function quickAction(id: (typeof QUICK_ACTIONS)[number]["id"]) {
    setBusy(id);
    try {
      if (id === "sac") {
        router.push("/app/stats?add=score");
        return;
      }
      const page = await createListPageAction(id);
      router.push(`/app/p/${page.id}`);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggle(todo: FlatTodo) {
    setTodos((cur) =>
      cur.map((t) => (t.id === todo.id ? { ...t, checked: !t.checked } : t)),
    );
    await toggleTodoAction(todo.id, !todo.checked);
  }

  return (
    <div className="mx-auto w-full max-w-[980px] space-y-5">
      {/* greeting */}
      <motion.header {...itemAnim} transition={{ duration: 0.5 }} className={`${CARD} relative overflow-hidden p-7 shadow-2xl shadow-slate-900/10 md:p-9`}>
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_30%,transparent),transparent_70%)] blur-2xl" />
        <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400 dark:text-neutral-500">
          <Sparkles size={12} className="text-[var(--accent)]" />
          {today || "Today"}
        </p>
        <h1 className="mt-2.5 text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold tracking-tight">
          {greeting},{" "}
          <span className="bg-[linear-gradient(100deg,var(--accent),#ec4899,#f97316)] bg-clip-text italic text-transparent [font-family:var(--font-instrument)]">
            {(displayName.trim().split(/\s+/)[0] || "scholar") + "."}
          </span>
        </h1>
        <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-slate-500 dark:text-neutral-400">
          {openTodos.length > 0
            ? `You have ${openTodos.length}${todos.length - doneCount > 6 ? "+" : ""} open to-dos and ${counts.assessments} logged results across ${counts.subjects} subjects.`
            : `Everything is checked off — and you have ${counts.assessments} logged results across ${counts.subjects} subjects.`}
        </p>
      </motion.header>

      {/* quick actions */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUICK_ACTIONS.map((action, i) => (
          <motion.button
            key={action.id}
            {...itemAnim}
            transition={{ duration: 0.5, delay: 0.06 + i * 0.05 }}
            onClick={() => void quickAction(action.id)}
            disabled={busy !== null}
            className="group relative overflow-hidden rounded-[22px] p-4 text-left text-white shadow-xl shadow-slate-900/15 transition hover:-translate-y-1 hover:shadow-2xl md:p-5"
            style={{ backgroundImage: action.gradient }}
          >
            <div className="flex items-start justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-white/25 backdrop-blur">
                {busy === action.id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <action.Icon size={19} />
                )}
              </span>
              <ArrowUpRight
                size={16}
                className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
              />
            </div>
            <p className="mt-6 text-[15px] font-extrabold tracking-tight md:mt-8">{action.label}</p>
            <p className="mt-0.5 text-[11.5px] font-medium text-white/75">{action.hint}</p>
          </motion.button>
        ))}
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Pages",
            value: String(counts.pages),
            Icon: NotebookPen,
            sub: "documents in workspace",
          },
          {
            label: "Tasks done",
            value: `${doneCount}/${todos.length}`,
            Icon: ListChecks,
            sub: `${taskPct}% complete`,
            bar: taskPct,
          },
          {
            label: "Subjects",
            value: String(counts.subjects),
            Icon: GraduationCap,
            sub: "being tracked",
          },
          {
            label: "Average score",
            value: overall.avg != null ? `${round1(overall.avg)}%` : "—",
            Icon: Target,
            sub:
              overall.best != null
                ? `personal best ${round1(overall.best)}%`
                : "log your first score",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            {...itemAnim}
            transition={{ duration: 0.5, delay: 0.16 + i * 0.05 }}
            className={`${CARD} p-5 shadow-lg shadow-slate-900/5`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-slate-400 dark:text-neutral-500">
                {stat.label}
              </p>
              <span className="grid size-7 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]">
                <stat.Icon size={14} />
              </span>
            </div>
            <p className="mt-3 text-[26px] font-extrabold tabular-nums tracking-tight">
              {stat.value}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-neutral-500">
              {stat.sub}
            </p>
            {stat.bar !== undefined && (
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-[var(--accent)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.bar}%` }}
                  transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* main grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* left column */}
        <div className="space-y-5">
          <motion.section {...itemAnim} transition={{ duration: 0.5, delay: 0.28 }} className={`${CARD} p-6 shadow-lg shadow-slate-900/5`}>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold tracking-tight">Jump back in</h2>
            </div>
            <div className="mt-4 space-y-1">
              {recentPages.length === 0 && (
                <p className="py-6 text-center text-[13px] font-medium text-slate-400">
                  No pages yet — create one from the quick actions above.
                </p>
              )}
              {recentPages.map((page) => {
                const Icon = getPageIcon(page.icon);
                return (
                  <Link
                    key={page.id}
                    href={`/app/p/${page.id}`}
                    className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]">
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold">{page.title || "Untitled"}</span>
                      <span suppressHydrationWarning className="block text-[11px] font-medium text-slate-400 dark:text-neutral-500">
                        Edited {formatDate(page.updatedAt.slice(0, 10))}
                      </span>
                    </span>
                    <ArrowUpRight size={15} className="shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 dark:text-neutral-600" />
                  </Link>
                );
              })}
            </div>
          </motion.section>

          <motion.section {...itemAnim} transition={{ duration: 0.5, delay: 0.36 }} className={`${CARD} p-6 shadow-lg shadow-slate-900/5`}>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold tracking-tight">Grade snapshot</h2>
              <Link
                href="/app/stats"
                className="flex items-center gap-1 text-[11.5px] font-extrabold text-[var(--accent)] hover:underline"
              >
                Statistics <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="mt-4 space-y-3.5">
              {subjectStats.length === 0 && (
                <p className="py-4 text-center text-[13px] font-medium text-slate-400">
                  No scores logged yet.
                </p>
              )}
              {subjectStats.slice(0, 4).map((s) => {
                const avgPct = s.avg != null ? round1(s.avg) : 0;
                const TrendIcon = (s.trend ?? 0) >= 0 ? TrendingUp : TrendingDown;
                const trendColor = (s.trend ?? 0) >= 0 ? "#10b981" : "#f43f5e";
                return (
                  <div key={s.subject.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex min-w-0 items-center gap-2 text-[13px] font-bold">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.subject.color }} />
                        <span className="truncate">{s.subject.name}</span>
                      </p>
                      <p className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-extrabold tabular-nums">
                        {s.trend != null && <TrendIcon size={13} style={{ color: trendColor }} />}
                        {s.avg != null ? `${avgPct}%` : "—"}
                      </p>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: s.subject.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${avgPct}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        </div>

        {/* right column */}
        <div className="space-y-5">
          <motion.section {...itemAnim} transition={{ duration: 0.5, delay: 0.32 }} className={`${CARD} p-6 shadow-lg shadow-slate-900/5`}>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold tracking-tight">Up next</h2>
              <Link
                href="/app/tasks"
                className="flex items-center gap-1 text-[11.5px] font-extrabold text-[var(--accent)] hover:underline"
              >
                All tasks <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="mt-4 space-y-1">
              {openTodos.length === 0 && (
                <p className="py-6 text-center text-[13px] font-medium text-slate-400">
                  Nothing open. Enjoy the calm.
                </p>
              )}
              {openTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                >
                  <button
                    onClick={() => void toggle(todo)}
                    aria-label="Mark as done"
                    className="grid size-[20px] shrink-0 place-items-center rounded-[7px] border-2 border-slate-400/70 transition hover:border-[var(--accent)] dark:border-neutral-500"
                  />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                    {todo.content || "Untitled task"}
                  </span>
                  <Link
                    href={`/app/p/${todo.pageId}`}
                    className="shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-extrabold text-slate-500 transition hover:bg-black/[0.09] dark:bg-white/10 dark:text-neutral-400"
                  >
                    {todo.pageTitle}
                  </Link>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section {...itemAnim} transition={{ duration: 0.5, delay: 0.4 }} className={`${CARD} p-6 shadow-lg shadow-slate-900/5`}>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold tracking-tight">Recent scores</h2>
              <Link
                href="/app/stats?add=score"
                className="flex items-center gap-1 text-[11.5px] font-extrabold text-[var(--accent)] hover:underline"
              >
                <Award size={12} /> Add score
              </Link>
            </div>
            <div className="mt-4 space-y-1">
              {recentScores.length === 0 && (
                <p className="py-6 text-center text-[13px] font-medium text-slate-400">
                  Log your first SAC score in Statistics.
                </p>
              )}
              {recentScores.map((row) => (
                <Link
                  key={row.id}
                  href="/app/stats"
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                >
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-[12.5px] font-extrabold tabular-nums text-white shadow-md"
                    style={{ background: scoreColor(row.score) }}
                  >
                    {round1(row.score)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold">{row.title}</span>
                    <span className="block text-[11px] font-medium text-slate-400 dark:text-neutral-500">
                      {row.subjectName} · {kindLabel(row.kind)}
                    </span>
                  </span>
                  <span suppressHydrationWarning className="shrink-0 text-[10.5px] font-extrabold text-slate-300 dark:text-neutral-600">
                    {formatDate(row.date)}
                  </span>
                </Link>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
