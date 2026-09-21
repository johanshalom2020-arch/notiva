"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CloudUpload,
  GripVertical,
  Heading1,
  Keyboard,
  Layers,
  Lightbulb,
  List,
  ListTodo,
  Lock,
  MousePointer2,
  Palette,
  PenSquare,
  SlashSquare,
  Sparkles,
  SquareCheckBig,
  Star,
  TextQuote,
  Type,
} from "lucide-react";
import { BG_PRESETS } from "@/lib/theme";

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="grid place-items-center rounded-xl bg-[linear-gradient(135deg,#8b5cf6,#ec4899_55%,#f59e0b)] text-white shadow-lg shadow-fuchsia-500/25"
        style={{ width: size, height: size }}
      >
        <PenSquare size={size * 0.55} strokeWidth={2.4} />
      </span>
      <span className="text-xl font-extrabold tracking-tight text-slate-900">Notiva</span>
    </span>
  );
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 shadow-lg shadow-slate-900/5 backdrop-blur-xl">
        <Link href="/" aria-label="Notiva home">
          <Logo size={32} />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
          <a href="#features" className="transition hover:text-slate-950">Features</a>
          <a href="#customize" className="transition hover:text-slate-950">Customize</a>
          <a href="#deploy" className="transition hover:text-slate-950">Deploy</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-900/5 hover:text-slate-950 sm:block"
          >
            Log in
          </Link>
          <Link
            href="/app"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
          >
            Open workspace
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function MockTodo({ text, done, delay }: { text: string; done?: boolean; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-center gap-2.5"
    >
      <span
        className={`grid size-[18px] place-items-center rounded-[6px] border-2 ${
          done ? "border-violet-500 bg-violet-500" : "border-slate-300 bg-white"
        }`}
      >
        {done && (
          <motion.span initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: delay + 0.35, type: "spring", stiffness: 500 }}>
            <Check size={12} strokeWidth={3.5} className="text-white" />
          </motion.span>
        )}
      </span>
      <span className={`text-[13px] ${done ? "text-slate-400 line-through" : "text-slate-700"}`}>{text}</span>
    </motion.div>
  );
}

function AppMockup() {
  return (
    <div className="relative mx-auto mt-16 max-w-4xl">
      <div className="absolute -inset-8 rounded-[2.5rem] bg-[linear-gradient(120deg,#f472b6,#a78bfa_45%,#38bdf8)] opacity-35 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 12 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformPerspective: 1200 }}
        className="relative overflow-hidden rounded-2xl bg-white/95 text-left shadow-2xl ring-1 ring-slate-900/10 backdrop-blur"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <span className="size-3 rounded-full bg-rose-400" />
          <span className="size-3 rounded-full bg-amber-400" />
          <span className="size-3 rounded-full bg-emerald-400" />
          <span className="ml-3 flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
            <Lock size={10} /> notiva.app/to-do-list
          </span>
        </div>

        <div className="flex">
          <div className="hidden w-48 shrink-0 border-r border-slate-100 bg-slate-50/70 p-4 md:block">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-md bg-[linear-gradient(135deg,#8b5cf6,#ec4899)] text-white">
                <PenSquare size={13} />
              </span>
              <span className="text-xs font-bold text-slate-700">Notiva</span>
            </div>
            <div className="mt-5 space-y-2.5">
              {[
                { Icon: Sparkles, label: "Welcome", active: false },
                { Icon: ListTodo, label: "To-Do List", active: true },
                { Icon: List, label: "My Lists", active: false },
                { Icon: BookOpen, label: "Journal", active: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium ${
                    item.active ? "bg-violet-100 text-violet-800" : "text-slate-500"
                  }`}
                >
                  <item.Icon size={14} /> {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 p-6 md:p-9">
            <div className="h-2.5 w-24 rounded-full bg-[linear-gradient(90deg,#f472b6,#a78bfa)]" />
            <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">To-Do List</h3>
            <div className="mt-5 space-y-3">
              <MockTodo text="Morning walk or stretch" done delay={0.15} />
              <MockTodo text="Reply to important emails" delay={0.3} />
              <MockTodo text="Buy groceries for the week" delay={0.45} />
              <MockTodo text="Finish the design mockup" delay={0.6} />
            </div>
            <div className="mt-6 border-t border-dashed border-slate-200 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Movies to watch</p>
              <div className="mt-3 space-y-2">
                {["Dune: Part Two", "Past Lives"].map((movie, i) => (
                  <div key={movie} className="flex items-center gap-2.5">
                    <span className="size-1.5 rounded-full bg-slate-700" />
                    <span className="text-[13px] text-slate-600">{movie}</span>
                    {i === 0 && <Star size={12} className="fill-amber-400 text-amber-400" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="animate-floaty absolute -left-8 top-20 hidden w-52 rotate-[-4deg] rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-900/10 lg:block">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <BookOpen size={12} className="text-violet-500" /> Books to read
        </p>
        <div className="mt-2.5 space-y-1.5 text-[12px] text-slate-600">
          <p>• The Creative Act</p>
          <p>• Project Hail Mary</p>
          <p className="text-slate-400 line-through">• Klara and the Sun</p>
        </div>
      </div>

      <div className="animate-floaty-slow absolute -right-6 bottom-16 hidden w-56 rotate-[3deg] rounded-2xl bg-slate-950 p-4 text-white shadow-2xl lg:block">
        <p className="flex items-center gap-2 text-[12px] font-semibold">
          <span className="grid size-5 place-items-center rounded-full bg-emerald-400 text-slate-950">
            <Check size={12} strokeWidth={3.5} />
          </span>
          Synced to your database
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
          Every keystroke saves instantly to Postgres.
        </p>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-36 text-center md:pt-44">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-blob absolute -top-24 left-[8%] size-[34rem] rounded-full bg-[radial-gradient(circle,#fda4af,transparent_65%)] opacity-70 blur-3xl" />
        <div className="animate-blob-2 absolute right-[4%] top-10 size-[30rem] rounded-full bg-[radial-gradient(circle,#c4b5fd,transparent_65%)] opacity-70 blur-3xl" />
        <div className="animate-blob absolute bottom-0 left-[35%] size-[28rem] rounded-full bg-[radial-gradient(circle,#7dd3fc,transparent_65%)] opacity-60 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-1.5 text-xs font-bold text-slate-600 shadow-sm backdrop-blur"
      >
        <Sparkles size={13} className="text-violet-600" />
        Free forever · Self-hostable · Yours
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mt-7 max-w-4xl text-[clamp(2.9rem,7.2vw,5.4rem)] font-extrabold leading-[1.02] tracking-tight text-slate-950"
      >
        Think it.{" "}
        <span className="bg-[linear-gradient(100deg,#8b5cf6,#ec4899_50%,#f97316)] bg-clip-text italic text-transparent [font-family:var(--font-instrument)]">
          Type it.
        </span>{" "}
        Done.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.18 }}
        className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600"
      >
        Notiva is the vibrant home for your to-do lists, your lists of things, and
        every note in between — fully customizable, and deployable to your own
        Supabase + Netlify in minutes.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.28 }}
        className="mt-9 flex flex-wrap items-center justify-center gap-3"
      >
        <Link
          href="/app"
          className="group inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-7 py-3.5 text-base font-bold text-white shadow-xl shadow-slate-900/25 transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
          Start writing — it&apos;s free
          <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
        </Link>
        <a
          href="#features"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-7 py-3.5 text-base font-bold text-slate-700 shadow-md backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
        >
          <MousePointer2 size={16} /> See what it does
        </a>
      </motion.div>

      <AppMockup />
    </section>
  );
}

const MARQUEE_WORDS = [
  "to-do lists",
  "journals",
  "grocery lists",
  "reading logs",
  "roadmaps",
  "meeting notes",
  "wishlists",
  "habit trackers",
  "trip plans",
  "idea dumps",
];

function Marquee() {
  const row = [...MARQUEE_WORDS, ...MARQUEE_WORDS];
  return (
    <section className="relative overflow-hidden border-y border-white/60 bg-white/50 py-5 backdrop-blur">
      <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap">
        {row.map((word, i) => (
          <span key={i} className="flex items-center gap-8 text-lg text-slate-500">
            <span className="italic [font-family:var(--font-instrument)]">{word}</span>
            <Sparkles size={14} className="text-fuchsia-400" />
          </span>
        ))}
      </div>
    </section>
  );
}

function BentoCard({
  icon,
  title,
  body,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      {...fadeUp}
      className={`group relative overflow-hidden rounded-3xl border border-white/70 bg-white/75 p-7 shadow-lg shadow-slate-900/5 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl ${className}`}
    >
      <div className="flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-600 ring-1 ring-violet-200/60">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-extrabold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
      {children}
    </motion.div>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-5xl scroll-mt-28 px-4 py-24 md:py-32">
      <motion.p {...fadeUp} className="text-center text-xs font-extrabold uppercase tracking-[0.25em] text-violet-600">
        Everything, in blocks
      </motion.p>
      <motion.h2
        {...fadeUp}
        className="mx-auto mt-3 max-w-2xl text-center text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl"
      >
        One editor for{" "}
        <span className="bg-[linear-gradient(100deg,#8b5cf6,#ec4899)] bg-clip-text italic text-transparent [font-family:var(--font-instrument)]">
          every list
        </span>{" "}
        you&apos;ll ever make
      </motion.h2>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        <BentoCard
          icon={<Layers size={20} />}
          title="Blocks for everything"
          body="Text, headings, to-dos, bulleted and numbered lists, quotes, callouts and dividers — compose pages like a document, not a form."
        >
          <div className="mt-5 flex flex-wrap gap-1.5">
            {[Type, Heading1, SquareCheckBig, List, TextQuote, Lightbulb].map((Icon, i) => (
              <span key={i} className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                <Icon size={15} />
              </span>
            ))}
          </div>
        </BentoCard>

        <BentoCard
          icon={<ListTodo size={20} />}
          title="To-dos that track themselves"
          body="Every checkbox from every page rolls up into All Tasks, with live progress so you always know what&apos;s left."
        >
          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "68%" }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, delay: 0.3, ease: "easeOut" }}
                className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6,#ec4899)]"
              />
            </div>
            <p className="mt-2 text-[11px] font-bold text-slate-400">68% complete · 9 of 13 tasks</p>
          </div>
        </BentoCard>

        <BentoCard
          icon={<Palette size={20} />}
          title="Paint it your way"
          body="Vibrant gradient backgrounds, custom two-color blends, accent colors, four typefaces, light or dark — saved to your database."
        >
          <div className="mt-5 flex -space-x-1.5">
            {BG_PRESETS.slice(0, 6).map((preset) => (
              <span
                key={preset.id}
                className="size-8 rounded-full ring-2 ring-white"
                style={{ background: preset.light }}
              />
            ))}
          </div>
        </BentoCard>

        <BentoCard
          icon={<Keyboard size={20} />}
          title="Keyboard-first"
          body="Press / to summon block commands, Enter to keep a list flowing, Backspace to merge — your hands never leave the keys."
        >
          <div className="mt-5 flex gap-2">
            {["/", "Enter", "Backspace"].map((key) => (
              <kbd key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] font-bold text-slate-600 shadow-[0_2px_0_rgba(15,23,42,0.08)]">
                {key}
              </kbd>
            ))}
          </div>
        </BentoCard>

        <BentoCard
          icon={<SlashSquare size={20} />}
          title="Drag, drop, done"
          body="Grab the handle on any block and drop it exactly where it belongs. Reordering is instant and always saved."
        >
          <div className="mt-5 space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-100">
                <GripVertical size={13} className="text-slate-300" />
                <div className={`h-1.5 rounded-full bg-slate-200 ${i === 1 ? "w-3/5" : "w-4/5"}`} />
              </div>
            ))}
          </div>
        </BentoCard>

        <BentoCard
          icon={<CloudUpload size={20} />}
          title="Deploy anywhere"
          body="Ship to Netlify with a Supabase Postgres database and reach your workspace from every laptop you own."
        >
          <div className="mt-5 flex flex-wrap gap-2">
            {["Supabase", "Netlify", "PostgreSQL", "Next.js"].map((tag) => (
              <span key={tag} className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-bold text-white">
                {tag}
              </span>
            ))}
          </div>
        </BentoCard>
      </div>
    </section>
  );
}

function Customize() {
  return (
    <section id="customize" className="scroll-mt-28 px-4 pb-24 md:pb-32">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-16 text-white md:px-16 md:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="animate-blob absolute -left-20 -top-24 size-96 rounded-full bg-violet-600/40 blur-3xl" />
          <div className="animate-blob-2 absolute -bottom-32 -right-16 size-96 rounded-full bg-fuchsia-500/30 blur-3xl" />
          <div className="animate-blob absolute right-1/4 top-0 size-64 rounded-full bg-cyan-400/25 blur-3xl" />
        </div>

        <div className="relative grid items-center gap-12 md:grid-cols-2">
          <motion.div {...fadeUp}>
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-fuchsia-300">Fully customizable</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
              Vibrant by default.{" "}
              <span className="italic text-fuchsia-300 [font-family:var(--font-instrument)]">Yours</span> in seconds.
            </h2>
            <p className="mt-5 leading-relaxed text-slate-300">
              Eight hand-tuned gradient backgrounds, a custom two-color blend with
              any angle, eight accent colors plus an eyedropper, four typefaces,
              light and dark modes, even a film-grain texture. Every choice syncs
              to Supabase and follows you to every device.
            </p>
            <Link
              href="/app/customize"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-extrabold text-slate-950 transition hover:-translate-y-0.5"
            >
              <Palette size={16} /> Open the customize studio
            </Link>
          </motion.div>

          <motion.div {...fadeUp} className="grid grid-cols-4 gap-3">
            {BG_PRESETS.map((preset, i) => (
              <motion.div
                key={preset.id}
                initial={{ opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.06, type: "spring", stiffness: 260, damping: 18 }}
                className="aspect-square rounded-2xl ring-1 ring-white/25"
                style={{ background: preset.light }}
                whileHover={{ scale: 1.08, rotate: -2 }}
              />
            ))}
            <div className="col-span-4 mt-1 flex flex-wrap gap-2">
              {["#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0284c7", "#ca8a04"].map((color) => (
                <span key={color} className="size-5 rounded-full ring-2 ring-white/30" style={{ background: color }} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="deploy" className="scroll-mt-28 px-4 pb-24">
      <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
        <h2 className="text-4xl font-extrabold tracking-tight text-slate-950 md:text-5xl">
          Your second brain is{" "}
          <span className="bg-[linear-gradient(100deg,#8b5cf6,#ec4899,#f97316)] bg-clip-text italic text-transparent [font-family:var(--font-instrument)]">
            waiting.
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-slate-600">
          Open the app now, or follow the deployment guide to put it on Netlify +
          Supabase and use it from every laptop you own.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/app"
            className="group inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-7 py-3.5 font-bold text-white shadow-xl shadow-slate-900/25 transition hover:-translate-y-0.5"
          >
            Launch Notiva
            <ArrowUpRight size={17} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <a
            href="https://github.com"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-7 py-3.5 font-bold text-slate-700 shadow-md backdrop-blur transition hover:-translate-y-0.5"
          >
            Read the deploy guide
          </a>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/60 bg-white/50 px-4 py-10 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 md:flex-row">
        <Logo size={28} />
        <p className="text-xs font-medium text-slate-500">
          Blocks, to-dos and lists — synced with PostgreSQL. Built with Next.js, Drizzle &amp; Tailwind.
        </p>
        <Link href="/app" className="text-xs font-extrabold text-violet-700 hover:underline">
          Open workspace
        </Link>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#f6f3ff]">
      <Nav />
      <Hero />
      <Marquee />
      <Features />
      <Customize />
      <FinalCta />
      <Footer />
    </main>
  );
}
