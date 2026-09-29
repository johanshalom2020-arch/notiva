"use client";

import { useEffect, useRef, useState } from "react";
import {
  Flag,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Timer as TimerIcon,
  Watch,
} from "lucide-react";

/* ------------------------------- utilities -------------------------------- */

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function fmt(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const patterns = [
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Short, self-contained "timer done" chime built with the Web Audio API —
 * no external audio file needed.
 */
function playChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const notes = [880, 1108, 1318];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  } catch {
    // Web Audio unsupported — fail silently, the visual "done" state still shows.
  }
}

// Deterministic petal layout (no Math.random) so server/client render match.
const PETALS = Array.from({ length: 24 }).map((_, i) => ({
  left: (i * 4.3 + (i % 5) * 11) % 100,
  delay: (i * 0.53) % 10,
  duration: 9 + (i % 6) * 1.6,
  size: 13 + (i % 5) * 4,
  drift: i % 2 === 0 ? 1 : -1,
  rotate: (i * 37) % 360,
}));

const TIMER_PRESETS = [5, 10, 15, 25, 45, 60];
const DEFAULT_MINUTES = 25;
const DEFAULT_VIDEO_ID = "jfKfPfyJRdk"; // A long-running 24/7 lofi stream — swap it below any time.

/* --------------------------------- ring ------------------------------------ */

function ProgressRing({
  progress, // 0 to 1
  size = 300,
  stroke = 18,
  label,
  sublabel,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  label: string;
  sublabel: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, progress)));
  const center = size / 2;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* soft glow behind the ring for depth */}
      <div
        className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(244,114,182,0.35),transparent_70%)] blur-2xl"
        style={{ width: size * 1.3, height: size * 1.3 }}
      />
      <svg width={size} height={size}>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="color-mix(in srgb, #db2777 14%, transparent)"
          strokeWidth={stroke}
        />
        {/* Rotate only the progress arc itself (as an SVG attribute, not a CSS
            transform on the whole <svg>) so it starts at 12 o'clock without
            dragging the foreignObject label along with it. */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="url(#sakura-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 0.25s linear" }}
        />
        <defs>
          <linearGradient id="sakura-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f9a8d4" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
        </defs>
        <foreignObject x={0} y={0} width={size} height={size}>
          <div className="flex h-full w-full flex-col items-center justify-center">
            <span className="text-[44px] font-extrabold tabular-nums tracking-tight text-rose-900 dark:text-rose-100">
              {label}
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-widest text-rose-400">
              {sublabel}
            </span>
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}

/* --------------------------------- page ------------------------------------ */

export function FocusClient() {
  const [mode, setMode] = useState<"timer" | "stopwatch">("timer");

  /* ---------------------------------- timer -------------------------------- */
  const [totalSeconds, setTotalSeconds] = useState(DEFAULT_MINUTES * 60);
  const [remaining, setRemaining] = useState(DEFAULT_MINUTES * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const endAtRef = useRef<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState(String(DEFAULT_MINUTES));

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      if (endAtRef.current == null) return;
      const remain = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(remain);
      if (remain <= 0) {
        setTimerRunning(false);
        setJustFinished(true);
        playChime();
      }
    }, 250);
    return () => clearInterval(id);
  }, [timerRunning]);

  function applyPreset(minutes: number) {
    setTotalSeconds(minutes * 60);
    setRemaining(minutes * 60);
    setCustomMinutes(String(minutes));
    setTimerRunning(false);
    setJustFinished(false);
    endAtRef.current = null;
  }

  function applyCustom() {
    const minutes = Math.min(180, Math.max(1, Math.round(Number(customMinutes) || DEFAULT_MINUTES)));
    applyPreset(minutes);
  }

  function startTimer() {
    if (remaining <= 0) return;
    setJustFinished(false);
    endAtRef.current = Date.now() + remaining * 1000;
    setTimerRunning(true);
  }
  function pauseTimer() {
    setTimerRunning(false);
  }
  function resetTimer() {
    setRemaining(totalSeconds);
    setTimerRunning(false);
    setJustFinished(false);
    endAtRef.current = null;
  }

  /* ------------------------------- stopwatch -------------------------------- */
  const [elapsed, setElapsed] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const startAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!swRunning) return;
    const id = setInterval(() => {
      if (startAtRef.current == null) return;
      setElapsed(Math.floor((Date.now() - startAtRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [swRunning]);

  function startStopwatch() {
    startAtRef.current = Date.now() - elapsed * 1000;
    setSwRunning(true);
  }
  function pauseStopwatch() {
    setSwRunning(false);
  }
  function resetStopwatch() {
    setSwRunning(false);
    setElapsed(0);
    setLaps([]);
    startAtRef.current = null;
  }
  function recordLap() {
    setLaps((cur) => [elapsed, ...cur]);
  }

  /* ---------------------------------- music --------------------------------- */
  const [videoId, setVideoId] = useState(DEFAULT_VIDEO_ID);
  const [videoInput, setVideoInput] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("notiva-focus-music");
      if (saved) setVideoId(saved);
    } catch {
      // localStorage unavailable (e.g. private browsing) — default stream still plays.
    }
  }, []);

  function applyMusic() {
    const id = extractYouTubeId(videoInput);
    if (!id) return;
    setVideoId(id);
    try {
      localStorage.setItem("notiva-focus-music", id);
    } catch {
      // ignore — the player still switches for this session
    }
    setVideoInput("");
  }

  const timerProgress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const stopwatchProgress = (elapsed % 60) / 60;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-6 md:px-0">
      <div className="relative overflow-hidden rounded-[28px] border border-rose-200/70 bg-[linear-gradient(165deg,#ffe3ec_0%,#ffc7dd_45%,#ffb0cd_100%)] p-1 shadow-2xl shadow-rose-900/15 dark:border-rose-900/40 dark:bg-[linear-gradient(165deg,#3a1626,#2a0f1c_60%,#1c0a13)]">
        <style>{`
          @keyframes sakura-fall-r {
            0%   { transform: translateY(-10%) translateX(0px)   rotate(0deg);   opacity: 0; }
            10%  { opacity: 0.95; }
            50%  { transform: translateY(300px) translateX(28px) rotate(170deg); }
            90%  { opacity: 0.9; }
            100% { transform: translateY(660px) translateX(-8px) rotate(340deg); opacity: 0; }
          }
          @keyframes sakura-fall-l {
            0%   { transform: translateY(-10%) translateX(0px)    rotate(0deg);    opacity: 0; }
            10%  { opacity: 0.95; }
            50%  { transform: translateY(300px) translateX(-28px) rotate(-170deg); }
            90%  { opacity: 0.9; }
            100% { transform: translateY(660px) translateX(8px)   rotate(-340deg); opacity: 0; }
          }
        `}</style>

        <div className="relative flex flex-col gap-6 rounded-[24px] p-5 md:p-7 lg:flex-row">
          {/* main timer / stopwatch card */}
          <div className="flex min-h-[480px] flex-1 flex-col items-center justify-center rounded-[22px] border border-white/60 bg-white/55 p-8 shadow-inner backdrop-blur-xl dark:border-white/10 dark:bg-black/25 md:p-12">
            <div className="mb-8 flex items-center gap-1.5 rounded-full bg-rose-100/80 p-1 dark:bg-white/10">
              <button
                onClick={() => setMode("timer")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-bold transition ${
                  mode === "timer"
                    ? "bg-white text-rose-600 shadow dark:bg-neutral-800 dark:text-rose-300"
                    : "text-rose-400 hover:text-rose-500"
                }`}
              >
                <TimerIcon size={15} /> Timer
              </button>
              <button
                onClick={() => setMode("stopwatch")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-bold transition ${
                  mode === "stopwatch"
                    ? "bg-white text-rose-600 shadow dark:bg-neutral-800 dark:text-rose-300"
                    : "text-rose-400 hover:text-rose-500"
                }`}
              >
                <Watch size={15} /> Stopwatch
              </button>
            </div>

            {mode === "timer" ? (
              <>
                <ProgressRing
                  progress={timerProgress}
                  label={fmt(remaining)}
                  sublabel={justFinished ? "Time's up!" : timerRunning ? "Focusing" : "Paused"}
                />
                <div className="mt-9 flex items-center gap-4">
                  <button
                    onClick={resetTimer}
                    aria-label="Reset timer"
                    className="grid size-13 place-items-center rounded-full bg-rose-100 text-rose-500 transition hover:bg-rose-200 dark:bg-white/10 dark:text-rose-300 dark:hover:bg-white/20"
                    style={{ width: 52, height: 52 }}
                  >
                    <RotateCcw size={20} />
                  </button>
                  <button
                    onClick={timerRunning ? pauseTimer : startTimer}
                    aria-label={timerRunning ? "Pause timer" : "Start timer"}
                    className="grid size-20 place-items-center rounded-full bg-[linear-gradient(135deg,#f472b6,#db2777)] text-white shadow-lg shadow-rose-500/40 transition hover:opacity-90"
                  >
                    {timerRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                  </button>
                  <span style={{ width: 52 }} />
                </div>
              </>
            ) : (
              <>
                <ProgressRing
                  progress={stopwatchProgress}
                  label={fmt(elapsed)}
                  sublabel={swRunning ? "Running" : elapsed > 0 ? "Paused" : "Ready"}
                />
                <div className="mt-9 flex items-center gap-4">
                  <button
                    onClick={resetStopwatch}
                    aria-label="Reset stopwatch"
                    className="grid place-items-center rounded-full bg-rose-100 text-rose-500 transition hover:bg-rose-200 dark:bg-white/10 dark:text-rose-300 dark:hover:bg-white/20"
                    style={{ width: 52, height: 52 }}
                  >
                    <RotateCcw size={20} />
                  </button>
                  <button
                    onClick={swRunning ? pauseStopwatch : startStopwatch}
                    aria-label={swRunning ? "Pause stopwatch" : "Start stopwatch"}
                    className="grid size-20 place-items-center rounded-full bg-[linear-gradient(135deg,#f472b6,#db2777)] text-white shadow-lg shadow-rose-500/40 transition hover:opacity-90"
                  >
                    {swRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                  </button>
                  <button
                    onClick={recordLap}
                    disabled={!swRunning}
                    aria-label="Record lap"
                    className="grid place-items-center rounded-full bg-rose-100 text-rose-500 transition hover:bg-rose-200 disabled:opacity-40 dark:bg-white/10 dark:text-rose-300 dark:hover:bg-white/20"
                    style={{ width: 52, height: 52 }}
                  >
                    <Flag size={18} />
                  </button>
                </div>
                {laps.length > 0 && (
                  <div className="mt-7 w-full max-w-[240px] space-y-1">
                    {laps.map((lap, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg px-2.5 py-1 text-[12.5px] font-semibold text-rose-500 odd:bg-rose-50/80 dark:text-rose-300 dark:odd:bg-white/5"
                      >
                        <span>Lap {laps.length - i}</span>
                        <span className="tabular-nums">{fmt(lap)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* dashboard side panel */}
          <div className="w-full space-y-5 lg:w-[320px]">
            {mode === "timer" && (
              <div className="rounded-[20px] border border-white/60 bg-white/55 p-5 shadow-inner backdrop-blur-xl dark:border-white/10 dark:bg-black/25">
                <p className="mb-3 text-[10.5px] font-extrabold uppercase tracking-widest text-rose-400">
                  Quick presets
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {TIMER_PRESETS.map((m) => (
                    <button
                      key={m}
                      onClick={() => applyPreset(m)}
                      className={`rounded-xl py-2 text-[13px] font-bold transition ${
                        totalSeconds === m * 60
                          ? "bg-[linear-gradient(135deg,#f472b6,#db2777)] text-white"
                          : "bg-rose-50/90 text-rose-500 hover:bg-rose-100 dark:bg-white/5 dark:text-rose-300 dark:hover:bg-white/10"
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>

                <p className="mb-2 mt-4 text-[10.5px] font-extrabold uppercase tracking-widest text-rose-400">
                  Custom
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-[13px] font-semibold outline-none focus:ring-2 focus:ring-rose-300 dark:border-rose-900/40 dark:bg-neutral-900 dark:text-white"
                  />
                  <span className="shrink-0 text-[12.5px] font-semibold text-rose-400">min</span>
                  <button
                    onClick={applyCustom}
                    className="shrink-0 rounded-xl bg-rose-500 px-3 py-2 text-[12.5px] font-bold text-white hover:bg-rose-600"
                  >
                    Set
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-[20px] border border-white/60 bg-white/55 p-5 shadow-inner backdrop-blur-xl dark:border-white/10 dark:bg-black/25">
              <p className="mb-3 flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-widest text-rose-400">
                <Music2 size={12} /> Sakura radio
              </p>
              <div className="overflow-hidden rounded-xl">
                <iframe
                  key={videoId}
                  width="100%"
                  height="160"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=0`}
                  title="Focus music"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="border-0"
                />
              </div>
              <p className="mt-2 text-[11px] text-rose-400">
                Defaults to a long-running lofi stream. If it doesn&apos;t load, paste any YouTube
                video or live link below.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  placeholder="Paste a YouTube link"
                  className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-[12.5px] outline-none focus:ring-2 focus:ring-rose-300 dark:border-rose-900/40 dark:bg-neutral-900 dark:text-white"
                />
                <button
                  onClick={applyMusic}
                  className="shrink-0 rounded-xl bg-rose-500 px-3 py-2 text-[12.5px] font-bold text-white hover:bg-rose-600"
                >
                  Use
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Falling sakura petals — rendered ABOVE the panels (higher z-index than
            the content below) and pointer-events-none, so they drift visibly
            across the whole card, including over the cards, without blocking
            any clicks underneath them. */}
        <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-[28px]">
          {PETALS.map((p, i) => (
            <span
              key={i}
              className="absolute top-[-24px]"
              style={{ left: `${p.left}%`, transform: `rotate(${p.rotate}deg)` }}
            >
              <span
                className="block bg-[linear-gradient(135deg,#ffd7e3,#f472b6)] shadow-sm"
                style={{
                  width: p.size,
                  height: p.size * 0.78,
                  borderRadius: "0% 60% 60% 60%",
                  opacity: 0.92,
                  animation: `sakura-fall-${p.drift > 0 ? "r" : "l"} ${p.duration}s linear ${p.delay}s infinite`,
                }}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
