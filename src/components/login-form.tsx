"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CircleAlert,
  Loader2,
  LogIn,
  PenSquare,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { signInAction, signUpAction, type AuthState } from "@/lib/auth-actions";

const FIELD =
  "w-full rounded-xl border border-white/40 bg-white/70 px-4 py-3 text-[14px] font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400/60";

const initial: AuthState = undefined;

export function LoginForm({ signupsDisabled }: { signupsDisabled: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInFormAction, signInPending] = useActionState(signInAction, initial);
  const [signUpState, signUpFormAction, signUpPending] = useActionState(signUpAction, initial);

  const isSignIn = mode === "signin";
  const state = isSignIn ? signInState : signUpState;
  const pending = isSignIn ? signInPending : signUpPending;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* vibrant backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(135deg,#fde68a,#fda4af_48%,#c4b5fd)]">
        <div className="animate-blob absolute -left-24 top-0 size-[30rem] rounded-full bg-[radial-gradient(circle,#f0abfc,transparent_65%)] opacity-70 blur-3xl" />
        <div className="animate-blob-2 absolute -right-20 bottom-0 size-[28rem] rounded-full bg-[radial-gradient(circle,#7dd3fc,transparent_65%)] opacity-60 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="rounded-[28px] border border-white/60 bg-white/80 p-8 shadow-2xl shadow-fuchsia-900/20 backdrop-blur-2xl md:p-9">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-[linear-gradient(135deg,#8b5cf6,#ec4899_55%,#f59e0b)] text-white shadow-lg">
              <PenSquare size={18} />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">Notiva</span>
          </Link>

          <h1 className="mt-6 text-[26px] font-extrabold tracking-tight text-slate-950">
            {isSignIn ? "Welcome back" : "Create your workspace"}
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            {isSignIn
              ? "Your pages, to-dos and scores are exactly where you left them."
              : "One account for every laptop you own — pages, lists, subjects and themes all sync."}
          </p>

          {/* tabs */}
          <div className="mt-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-900/[0.05] p-1.5">
            {(
              [
                { id: "signin", label: "Sign in" },
                { id: "signup", label: "Create account" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={`rounded-xl px-3 py-2.5 text-[13px] font-extrabold transition ${
                  mode === tab.id
                    ? "bg-white text-slate-900 shadow-md"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {state?.error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-500/10 px-3.5 py-3 text-[12.5px] font-semibold text-rose-600 ring-1 ring-rose-500/20">
              <CircleAlert size={15} className="mt-px shrink-0" />
              {state.error}
            </div>
          )}

          {isSignIn ? (
            <form key="signin" action={signInFormAction} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  Email
                </label>
                <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={FIELD} />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  Password
                </label>
                <input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" className={FIELD} />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-[14px] font-extrabold text-white shadow-xl transition hover:bg-slate-800 disabled:opacity-50"
              >
                {pending ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                Sign in
              </button>
            </form>
          ) : (
            <form key="signup" action={signUpFormAction} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  Your name
                </label>
                <input name="name" type="text" required autoComplete="name" placeholder="Ada Lovelace" className={FIELD} />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  Email
                </label>
                <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={FIELD} />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  Password
                </label>
                <input name="password" type="password" required minLength={6} autoComplete="new-password" placeholder="At least 6 characters" className={FIELD} />
              </div>
              <button
                type="submit"
                disabled={pending || signupsDisabled}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#8b5cf6,#ec4899_60%,#f59e0b)] px-5 py-3.5 text-[14px] font-extrabold text-white shadow-xl shadow-fuchsia-500/25 transition hover:brightness-110 disabled:opacity-50"
              >
                {pending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {signupsDisabled ? "Sign ups disabled" : "Create account"}
              </button>
            </form>
          )}

          <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-slate-400">
            <ShieldCheck size={13} className="mt-px shrink-0 text-emerald-500" />
            Passwords are bcrypt-hashed in your own Supabase database. Sessions last 30 days
            per device — no emails, no tracking.
          </p>
        </div>

        <p className="mt-5 text-center text-[12px] font-semibold text-slate-600">
          <Link href="/" className="inline-flex items-center gap-1.5 transition hover:text-slate-950">
            <Sparkles size={12} /> Back to the landing page
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
