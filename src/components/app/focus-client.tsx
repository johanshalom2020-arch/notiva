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
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
const PETALS = Array.from({ length: 16 }).map((_, i) => ({
  left: (i * 6.25 + (i % 3) * 9) % 100,
  delay: (i * 0.71) % 9,
  duration: 10 + (i % 5) * 2,
  size: 8 + (i % 4) * 3,
  drift: i % 2 === 0 ? 1 : -1,
}));

const TIMER_PRESETS = [5, 10, 15, 25, 45, 60];
const DEFAULT_MINUTES = 25;
const DEFAULT_VIDEO_ID = "jfKfPfyJRdk"; // A long-running 24/7 lofi stream — swap it below any time.

/* --------------------------------- ring ------------------------------------ */

function ProgressRing({
  progress, // 0 to 1
  size = 260,
  stroke = 14,
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
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="color-mix(in srgb, #db2777 12%, transparent)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#sakura-gradient)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.25s linear" }}
      />
      <defs>
        <linearGradient id="sakura-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f9a8d4" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <foreignObject x={0} y={0} width={size} height={size}>
        <div
          className="flex h-full w-full rotate-90 flex-col items-center justify-center"
          style={{ transform: "rotate(90deg)" }}
        >
          <span className="text-[36px] font-extrabold tabular-nums tracking-tight text-rose-900 dark:text-rose-100">
            {label}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-rose-400">
            {sublabel}
          </span>
        </div>
      </foreignObject>
    </svg>
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
      <div className="relative overflow-hidden rounded-[28px] border border-rose-200/60 bg-[linear-gradient(180deg,#fff5f8,#ffeef3)] p-1 shadow-2xl shadow-rose-900/10 dark:border-rose-900/30 dark:bg-[linear-gradient(180deg,#2a1620,#20121a)]">
        {/* falling sakura petals */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {PETALS.map((p, i) => (
            <span
              key={i}
              className="absolute top-[-20px] rounded-[60%_40%_60%_40%] bg-[linear-gradient(135deg,#ffd1dc,#f472b6)] opacity-70"
              style={
                {
                  left: `${p.left}%`,
                  width: p.size,
                  height: p.size * 0.8,
                  animation: `sakura-fall-${p.drift > 0 ? "r" : "l"} ${p.duration}s linear ${p.delay}s infinite`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
        <style>{`
          @keyframes sakura-fall-r {
            0% { transform: translate(0, -5%) rotate(0deg); opacity: 0; }
            10% { opacity: 0.8; }
            100% { transform: translate(40px, 620px) rotate(340deg); opacity: 0; }
          }
          @keyframes sakura-fall-l {
            0% { transform: translate(0, -5%) rotate(0deg); opacity: 0; }
            10% { opacity: 0.8; }
            100% { transform: translate(-40px, 620px) rotate(-340deg); opacity: 0; }
          }
        `}</style>

        <div className="relative z-10 flex flex-col gap-6 rounded-[24px] p-5 md:p-7 lg:flex-row">
          {/* main timer / stopwatch card */}
          <div className="flex flex-1 flex-col items-center rounded-[22px] bg-white/70 p-6 backdrop-blur-xl dark:bg-black/20 md:p-10">
            <div className="mb-6 flex items-center gap-1.5 rounded-full bg-rose-100/80 p-1 dark:bg-white/10">
              <button
                onClick={() => setMode("timer")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-bold transition ${
                  mode === "timer"
                    ? "bg-white text-rose-600 shadow dark:bg-neutral-800 dark:text-rose-300"
                    : "text-rose-400 hover:text-rose-500"
                }`}
              >
                <TimerIcon size={14} /> Timer
              </button>
              <button
                onClick={() => setMode("stopwatch")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-bold transition ${
                  mode === "stopwatch"
                    ? "bg-white text-rose-600 shadow dark:bg-neutral-800 dark:text-rose-300"
                    : "text-rose-400 hover:text-rose-500"
                }`}
              >
                <Watch size={14} /> Stopwatch
              </button>
            </div>

            {mode === "timer" ? (
              <>
                <ProgressRing
                  progress={timerProgress}
                  label={fmt(remaining)}
                  sublabel={justFinished ? "Time's up!" : timerRunning ? "Focusing" : "Paused"}
                />
                <div className="mt-7 flex items-center gap-3">
                  <button
                    onClick={resetTimer}
                    aria-label="Reset timer"
                    className="grid size-12 place-items-center rounded-full bg-rose-100 text-rose-500 transition hover:bg-rose-200 dark:bg-white/10 dark:text-rose-300 dark:hover:bg-white/20"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    onClick={timerRunning ? pauseTimer : startTimer}
                    aria-label={timerRunning ? "Pause timer" : "Start timer"}
                    className="grid size-16 place-items-center rounded-full bg-[linear-gradient(135deg,#f472b6,#db2777)] text-white shadow-lg shadow-rose-500/30 transition hover:opacity-90"
                  >
                    {timerRunning ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
                  </button>
                  <span className="w-12" />
                </div>
              </>
            ) : (
              <>
                <ProgressRing
                  progress={stopwatchProgress}
                  label={fmt(elapsed)}
                  sublabel={swRunning ? "Running" : elapsed > 0 ? "Paused" : "Ready"}
                />
                <div className="mt-7 flex items-center gap-3">
                  <button
                    onClick={resetStopwatch}
                    aria-label="Reset stopwatch"
                    className="grid size-12 place-items-center rounded-full bg-rose-100 text-rose-500 transition hover:bg-rose-200 dark:bg-white/10 dark:text-rose-300 dark:hover:bg-white/20"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    onClick={swRunning ? pauseStopwatch : startStopwatch}
                    aria-label={swRunning ? "Pause stopwatch" : "Start stopwatch"}
                    className="grid size-16 place-items-center rounded-full bg-[linear-gradient(135deg,#f472b6,#db2777)] text-white shadow-lg shadow-rose-500/30 transition hover:opacity-90"
                  >
                    {swRunning ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
                  </button>
                  <button
                    onClick={recordLap}
                    disabled={!swRunning}
                    aria-label="Record lap"
                    className="grid size-12 place-items-center rounded-full bg-rose-100 text-rose-500 transition hover:bg-rose-200 disabled:opacity-40 dark:bg-white/10 dark:text-rose-300 dark:hover:bg-white/20"
                  >
                    <Flag size={16} />
                  </button>
                </div>
                {laps.length > 0 && (
                  <div className="mt-6 w-full max-w-[220px] space-y-1">
                    {laps.map((lap, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg px-2.5 py-1 text-[12.5px] font-semibold text-rose-500 odd:bg-rose-50 dark:text-rose-300 dark:odd:bg-white/5"
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
              <div className="rounded-[20px] bg-white/70 p-5 backdrop-blur-xl dark:bg-black/20">
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
                          : "bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-white/5 dark:text-rose-300 dark:hover:bg-white/10"
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

            <div className="rounded-[20px] bg-white/70 p-5 backdrop-blur-xl dark:bg-black/20">
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
      </div>
    </div>
  );
}
