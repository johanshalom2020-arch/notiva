"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AtSign,
  Check,
  Loader2,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
  Type,
  User,
  Wand2,
} from "lucide-react";
import { saveThemeAction } from "@/lib/actions";
import { updateNameAction } from "@/lib/auth-actions";
import { useAppTheme } from "@/components/app/app-shell";
import {
  ACCENTS,
  BG_PRESETS,
  DEFAULT_THEME,
  FONT_LABELS,
  FONT_STACKS,
  resolveBackground,
  type FontChoice,
  type Theme,
} from "@/lib/theme";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-white/50 bg-white/75 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-950/60 md:p-7">
      <h2 className="text-[16px] font-extrabold tracking-tight">{title}</h2>
      <p className="mt-1 text-[12.5px] leading-relaxed text-slate-400 dark:text-neutral-500">{hint}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function CustomizeClient({
  initialTheme,
  user,
}: {
  initialTheme: Theme;
  user: { name: string; email: string };
}) {
  const { theme, setTheme } = useAppTheme();
  const [savedFlash, setSavedFlash] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [name, setName] = useState(user.name);
  const [nameState, setNameState] = useState<"idle" | "saving" | "saved">("idle");

  // The server-rendered theme is the source of truth on first mount
  useEffect(() => {
    setTheme(initialTheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback(
    (next: Theme) => {
      setTheme(next);
      setSavedFlash("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void saveThemeAction(next).then(() => {
          setSavedFlash("saved");
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setSavedFlash("idle"), 1600);
        });
      }, 450);
    },
    [setTheme],
  );

  const set = <K extends keyof Theme>(key: K, value: Theme[K]) =>
    update({ ...theme, [key]: value });

  return (
    <div className="mx-auto w-full max-w-[900px]">
      {/* header */}
      <div className="mb-6 flex items-center justify-between rounded-[26px] border border-white/50 bg-white/75 px-6 py-6 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-950/60 md:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--accent)] text-white shadow-lg">
            <Palette size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Customize</h1>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-400 dark:text-neutral-500">
              Changes apply instantly and sync to every device.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3.5 py-1.5 text-[11px] font-bold text-slate-500 dark:bg-white/10 dark:text-neutral-300">
          {savedFlash === "saving" && (
            <>
              <Loader2 size={12} className="animate-spin" /> Saving
            </>
          )}
          {savedFlash === "saved" && (
            <>
              <Check size={13} className="text-emerald-500" /> Saved
            </>
          )}
          {savedFlash === "idle" && (
            <>
              <Sparkles size={12} className="text-[var(--accent)]" /> Live
            </>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {/* profile */}
        <Section title="Profile" hint="Your name shows up on the dashboard greeting. Subjects and targets live on the Statistics page.">
          <div className="flex flex-wrap items-center gap-5">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--accent),#ec4899)] text-2xl font-extrabold text-white shadow-lg">
              {(name || user.email).charAt(0).toUpperCase()}
            </span>
            <div className="min-w-60 flex-1 space-y-3">
              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  <User size={11} /> Display name
                </span>
                <span className="flex items-center gap-2">
                  <input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameState("idle");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    placeholder="Your name"
                    className="w-full rounded-xl border border-black/[0.08] bg-white/70 px-3.5 py-2.5 text-[13.5px] font-medium outline-none transition focus:ring-2 focus:ring-[var(--accent)]/40 dark:border-white/10 dark:bg-white/[0.06]"
                  />
                  <button
                    onClick={async () => {
                      if (!name.trim()) return;
                      setNameState("saving");
                      await updateNameAction(name).finally(() => {});
                      setNameState("saved");
                      setTimeout(() => setNameState("idle"), 1600);
                    }}
                    disabled={nameState === "saving" || name.trim() === user.name}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-md transition hover:brightness-110 disabled:opacity-40"
                  >
                    {nameState === "saving" ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : nameState === "saved" ? (
                      <Check size={13} strokeWidth={3} />
                    ) : null}
                    {nameState === "saved" ? "Saved" : "Save"}
                  </button>
                </span>
              </label>
              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  <AtSign size={11} /> Email
                </span>
                <input
                  value={user.email}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-black/[0.06] bg-black/[0.03] px-3.5 py-2.5 text-[13.5px] font-medium text-slate-400 dark:border-white/10 dark:bg-white/[0.04]"
                />
              </label>
            </div>
          </div>
        </Section>

        {/* mode */}
        <Section title="Mode" hint="Light keeps colors pastel and airy; dark turns every background into a deep, moody gradient.">
          <div className="grid max-w-md grid-cols-2 gap-2 rounded-2xl bg-black/[0.05] p-1.5 dark:bg-white/[0.06]">
            {(["light", "dark"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => set("mode", mode)}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13.5px] font-extrabold capitalize transition ${
                  theme.mode === mode
                    ? "bg-white text-slate-900 shadow-md dark:bg-neutral-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                {mode === "light" ? <Sun size={16} /> : <Moon size={16} />}
                {mode}
              </button>
            ))}
          </div>
        </Section>

        {/* background */}
        <Section title="Background" hint="Pick a vibrant gradient preset, or build your own two-color blend below.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BG_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => set("preset", preset.id)}
                className="group text-left"
              >
                <span
                  className={`block h-20 rounded-2xl bg-cover shadow-inner ring-2 transition group-hover:scale-[1.03] ${
                    theme.preset === preset.id ? "ring-[var(--accent)]" : "ring-black/10 dark:ring-white/15"
                  }`}
                  style={{
                    backgroundImage: theme.mode === "dark" ? preset.dark : preset.light,
                  }}
                />
                <span className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold text-slate-500 dark:text-neutral-400">
                  {theme.preset === preset.id && <Check size={12} className="text-[var(--accent)]" />}
                  {preset.name}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-slate-300/80 p-4 dark:border-neutral-600/60">
            <button
              onClick={() => set("preset", "custom")}
              className="flex items-center gap-2 text-[13px] font-extrabold text-slate-600 dark:text-neutral-200"
            >
              <Wand2 size={15} className="text-[var(--accent)]" />
              Custom blend
              {theme.preset === "custom" && (
                <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  Active
                </span>
              )}
            </button>
            <div className="mt-4 flex flex-wrap items-center gap-5">
              <span
                className="h-16 w-28 rounded-2xl shadow-md ring-1 ring-black/10 dark:ring-white/15"
                style={{
                  backgroundImage: `linear-gradient(${theme.custom.angle}deg, ${theme.custom.from}, ${theme.custom.to})`,
                }}
              />
              <label className="flex items-center gap-2 text-[12px] font-bold text-slate-500 dark:text-neutral-400">
                From
                <input
                  type="color"
                  value={theme.custom.from}
                  onChange={(e) => {
                    set("preset", "custom");
                    update({ ...theme, preset: "custom", custom: { ...theme.custom, from: e.target.value } });
                  }}
                />
              </label>
              <label className="flex items-center gap-2 text-[12px] font-bold text-slate-500 dark:text-neutral-400">
                To
                <input
                  type="color"
                  value={theme.custom.to}
                  onChange={(e) => {
                    update({ ...theme, preset: "custom", custom: { ...theme.custom, to: e.target.value } });
                  }}
                />
              </label>
              <label className="flex min-w-44 flex-1 items-center gap-3 text-[12px] font-bold text-slate-500 dark:text-neutral-400">
                Angle
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={theme.custom.angle}
                  onChange={(e) =>
                    update({
                      ...theme,
                      preset: "custom",
                      custom: { ...theme.custom, angle: Number(e.target.value) },
                    })
                  }
                  className="w-full"
                />
                <span className="w-9 tabular-nums">{theme.custom.angle}°</span>
              </label>
            </div>
          </div>
        </Section>

        {/* accent */}
        <Section title="Accent color" hint="Used for checkboxes, links, quotes, callouts, progress bars and highlights.">
          <div className="flex flex-wrap items-center gap-3">
            {ACCENTS.map((color) => (
              <button
                key={color}
                onClick={() => set("accent", color)}
                aria-label={`Accent ${color}`}
                className={`grid size-10 place-items-center rounded-full shadow-md transition hover:scale-110 ${
                  theme.accent === color ? "ring-2 ring-offset-2 ring-[color:var(--accent)] ring-offset-white dark:ring-offset-neutral-900" : ""
                }`}
                style={{ background: color }}
              >
                {theme.accent === color && <Check size={15} strokeWidth={3.5} className="text-white" />}
              </button>
            ))}
            <label className="flex cursor-pointer items-center gap-2 rounded-full bg-black/[0.05] px-3.5 py-2 text-[12px] font-bold text-slate-500 transition hover:bg-black/[0.08] dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/15">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(theme.accent) ? theme.accent : "#7c3aed"}
                onChange={(e) => set("accent", e.target.value)}
                className="!h-5 !w-5 !rounded-full"
              />
              Custom
            </label>
          </div>
        </Section>

        {/* font */}
        <Section title="Typeface" hint="The voice of your whole workspace.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(FONT_STACKS) as FontChoice[]).map((font) => (
              <button
                key={font}
                onClick={() => set("font", font)}
                className={`rounded-2xl border-2 bg-white/60 p-4 text-left transition hover:-translate-y-0.5 dark:bg-white/[0.04] ${
                  theme.font === font
                    ? "border-[var(--accent)]"
                    : "border-black/[0.06] dark:border-white/10"
                }`}
              >
                <span
                  className="block text-2xl font-bold"
                  style={{ fontFamily: FONT_STACKS[font] }}
                >
                  Aa
                </span>
                <span className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-slate-500 dark:text-neutral-400">
                  {theme.font === font && <Check size={12} className="text-[var(--accent)]" />}
                  <Type size={11} className="opacity-40" />
                  {FONT_LABELS[font]}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* texture + reset */}
        <div className="grid gap-5 md:grid-cols-2">
          <Section title="Film grain" hint="A subtle analog texture over the whole workspace.">
            <button
              onClick={() => set("grain", !theme.grain)}
              role="switch"
              aria-checked={theme.grain}
              className={`relative h-8 w-14 rounded-full transition ${
                theme.grain ? "bg-[var(--accent)]" : "bg-black/[0.12] dark:bg-white/15"
              }`}
            >
              <span
                className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${
                  theme.grain ? "left-7" : "left-1"
                }`}
              />
            </button>
          </Section>

          <Section title="Start over" hint="Restore Notiva's original sunrise look.">
            <button
              onClick={() => update(DEFAULT_THEME)}
              className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-4 py-2.5 text-[13px] font-extrabold text-rose-500 transition hover:bg-rose-500/15"
            >
              <RotateCcw size={14} /> Reset to defaults
            </button>
          </Section>
        </div>

        {/* live preview hint */}
        <div
          className="flex items-center gap-3 rounded-[22px] p-5 text-white shadow-xl"
          style={{ backgroundImage: resolveBackground(theme) }}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/25 backdrop-blur">
            <Sparkles size={16} />
          </span>
          <p className="text-[13px] font-bold leading-snug drop-shadow-sm">
            This is your current background — look around, it&apos;s already
            everywhere. Open a page to see your new workspace in action.
          </p>
        </div>
      </div>
    </div>
  );
}
