"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Palette, PenSquare, X } from "lucide-react";
import { FONT_STACKS, resolveBackground, type Theme } from "@/lib/theme";
import type { PageMeta } from "@/lib/blocks";
import { Sidebar } from "./sidebar";

type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used inside AppShell");
  return ctx;
}

export function AppShell({
  pages,
  initialTheme,
  user,
  children,
}: {
  pages: PageMeta[];
  initialTheme: Theme;
  user: { name: string; email: string };
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [navOpen, setNavOpen] = useState(false);

  // Sync if the server sends a different persisted theme (e.g. after refresh)
  useEffect(() => {
    setTheme((current) =>
      JSON.stringify(current) === JSON.stringify(initialTheme) ? current : initialTheme,
    );
  }, [initialTheme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  const dark = theme.mode === "dark";
  const background = resolveBackground(theme);

  const styleVars = {
    "--accent": theme.accent,
    "--app-font": FONT_STACKS[theme.font],
    backgroundImage: background,
  } as CSSProperties;

  return (
    <ThemeContext.Provider value={value}>
      <div className={dark ? "dark" : ""}>
        <div
          className="fixed inset-0 bg-cover bg-fixed"
          style={styleVars}
          aria-hidden
        />
        {theme.grain && <div className="grain" aria-hidden />}

        <div
          className="relative min-h-screen text-slate-800 [font-family:var(--app-font)] dark:text-neutral-100"
          style={styleVars}
        >
          {/* desktop sidebar */}
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] p-3 md:block">
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/65 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-950/55">
              <Sidebar pages={pages} user={user} onNavigate={() => setNavOpen(false)} />
            </div>
          </aside>

          {/* mobile sidebar drawer */}
          <AnimatePresence>
            {navOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setNavOpen(false)}
                  className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden"
                />
                <motion.aside
                  initial={{ x: -300 }}
                  animate={{ x: 0 }}
                  exit={{ x: -300 }}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  className="fixed inset-y-0 left-0 z-50 w-[280px] p-3 md:hidden"
                >
                  <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/85 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-950/80">
                    <Sidebar pages={pages} user={user} onNavigate={() => setNavOpen(false)} onClose={() => setNavOpen(false)} />
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* mobile top bar */}
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/40 bg-white/60 px-4 py-2.5 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/50 md:hidden">
            <button
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
              className="grid size-9 place-items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
            >
              <Menu size={18} />
            </button>
            <Link href="/app" className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
              <span className="grid size-6 place-items-center rounded-lg bg-[linear-gradient(135deg,var(--accent),#ec4899)] text-white">
                <PenSquare size={13} />
              </span>
              Notiva
            </Link>
            <Link
              href="/app/customize"
              aria-label="Customize"
              className="grid size-9 place-items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
            >
              <Palette size={16} />
            </Link>
          </div>

          <main className="relative z-10 px-4 pb-24 pt-6 md:pl-[296px] md:pr-6 md:pt-8">
            {children}
          </main>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

export function CloseButton({ onClose }: { onClose?: () => void }) {
  if (!onClose) return null;
  return (
    <button
      onClick={onClose}
      aria-label="Close navigation"
      className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-black/5 hover:text-slate-700 dark:hover:bg-white/10 md:hidden"
    >
      <X size={15} />
    </button>
  );
}
