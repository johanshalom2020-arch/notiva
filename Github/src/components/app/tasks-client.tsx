"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, ListChecks, PartyPopper } from "lucide-react";
import { toggleTodoAction } from "@/lib/actions";
import { getPageIcon } from "@/lib/icons";

type TodoItem = { id: string; content: string; checked: boolean };
type TodoGroup = {
  pageId: string;
  pageTitle: string;
  pageIcon: string;
  items: TodoItem[];
};

function ProgressRing({ percent }: { percent: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative grid size-36 place-items-center">
      <svg className="size-36 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          className="stroke-black/[0.07] dark:stroke-white/10"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke="var(--accent)"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - percent / 100) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-extrabold tabular-nums tracking-tight">{percent}%</p>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">done</p>
      </div>
    </div>
  );
}

export function TasksClient({ groups }: { groups: TodoGroup[] }) {
  const [data, setData] = useState(groups);
  const [showDone, setShowDone] = useState(true);

  useEffect(() => {
    setData((cur) => (JSON.stringify(cur) === JSON.stringify(groups) ? cur : groups));
  }, [groups]);

  const all = data.flatMap((g) => g.items);
  const doneCount = all.filter((t) => t.checked).length;
  const percent = all.length === 0 ? 100 : Math.round((doneCount / all.length) * 100);

  async function toggle(item: TodoItem) {
    setData((cur) =>
      cur.map((g) => ({
        ...g,
        items: g.items.map((t) => (t.id === item.id ? { ...t, checked: !t.checked } : t)),
      })),
    );
    await toggleTodoAction(item.id, !item.checked);
  }

  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="rounded-[26px] border border-white/50 bg-white/75 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-950/60 md:p-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-11 place-items-center rounded-2xl bg-[var(--accent)] text-white shadow-lg">
                <ListChecks size={20} />
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight">All Tasks</h1>
            </div>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-slate-500 dark:text-neutral-400">
              Every to-do from every page, gathered in one place. Check things off
              here or inside the pages — it all stays in sync.
            </p>
            <button
              onClick={() => setShowDone((v) => !v)}
              className="mt-4 rounded-full bg-black/[0.05] px-3.5 py-1.5 text-[11.5px] font-bold text-slate-500 transition hover:bg-black/[0.08] dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/15"
            >
              {showDone ? "Hide completed" : "Show completed"}
            </button>
          </div>
          <ProgressRing percent={percent} />
        </div>

        {all.length > 0 && percent === 100 && (
          <div className="mt-6 flex items-center gap-2.5 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-4 py-3 text-[13.5px] font-semibold text-slate-700 ring-1 ring-[color-mix(in_srgb,var(--accent)_20%,transparent)] dark:text-neutral-200">
            <PartyPopper size={16} className="text-[var(--accent)]" />
            Everything is checked off. Glorious.
          </div>
        )}

        <div className="mt-8 space-y-5">
          {data.length === 0 && (
            <p className="rounded-2xl bg-black/[0.04] px-5 py-8 text-center text-[13.5px] font-medium text-slate-400 dark:bg-white/[0.05] dark:text-neutral-500">
              No to-dos yet. Add a to-do block on any page and it will appear here.
            </p>
          )}
          {data.map((group) => {
            const done = group.items.filter((t) => t.checked).length;
            const groupPercent = group.items.length
              ? Math.round((done / group.items.length) * 100)
              : 0;
            const visible = group.items.filter((t) => showDone || !t.checked);
            const GroupIcon = getPageIcon(group.pageIcon);
            return (
              <div
                key={group.pageId}
                className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white/60 dark:border-white/[0.07] dark:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between gap-3 px-5 pt-4">
                  <Link
                    href={`/app/p/${group.pageId}`}
                    className="group/link flex min-w-0 items-center gap-2.5"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]">
                      <GroupIcon size={15} />
                    </span>
                    <span className="truncate text-[15px] font-extrabold tracking-tight group-hover/link:underline">
                      {group.pageTitle}
                    </span>
                    <ArrowUpRight
                      size={14}
                      className="shrink-0 text-slate-300 transition group-hover/link:text-slate-500"
                    />
                  </Link>
                  <span className="shrink-0 text-[11.5px] font-bold tabular-nums text-slate-400">
                    {done}/{group.items.length}
                  </span>
                </div>

                <div className="mx-5 mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-[var(--accent)]"
                    initial={false}
                    animate={{ width: `${groupPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>

                <ul className="space-y-1 px-3 py-3">
                  <AnimatePresence initial={false}>
                    {visible.map((item) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                      >
                        <button
                          onClick={() => void toggle(item)}
                          aria-label={item.checked ? "Mark as not done" : "Mark as done"}
                          className={`grid size-[20px] shrink-0 place-items-center rounded-[7px] border-2 transition ${
                            item.checked
                              ? "border-[var(--accent)] bg-[var(--accent)]"
                              : "border-slate-400/70 hover:border-[var(--accent)] dark:border-neutral-500"
                          }`}
                        >
                          {item.checked && <Check size={12} strokeWidth={3.5} className="text-white" />}
                        </button>
                        <span
                          className={`text-[14px] ${
                            item.checked
                              ? "text-slate-400 line-through dark:text-neutral-500"
                              : "text-slate-700 dark:text-neutral-200"
                          }`}
                        >
                          {item.content || "Untitled task"}
                        </span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                  {visible.length === 0 && (
                    <li className="px-2 py-1.5 text-[12.5px] font-medium text-slate-400">
                      All tasks in this page are complete.
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
