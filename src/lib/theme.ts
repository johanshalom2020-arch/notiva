export type ThemeMode = "light" | "dark";
export type FontChoice = "sans" | "serif" | "mono" | "rounded";

export type Theme = {
  mode: ThemeMode;
  /** id of a background preset, or "custom" */
  preset: string;
  custom: { from: string; to: string; angle: number };
  accent: string;
  font: FontChoice;
  grain: boolean;
};

export type BgPreset = {
  id: string;
  name: string;
  light: string;
  dark: string;
};

export const BG_PRESETS: BgPreset[] = [
  {
    id: "sunrise",
    name: "Sunrise",
    light: "linear-gradient(135deg,#fde68a 0%,#fda4af 48%,#c4b5fd 100%)",
    dark: "linear-gradient(135deg,#0f172a 0%,#4c1d95 55%,#9d174d 100%)",
  },
  {
    id: "ocean",
    name: "Ocean",
    light: "linear-gradient(135deg,#a5f3fc 0%,#93c5fd 50%,#c4b5fd 100%)",
    dark: "linear-gradient(135deg,#020617 0%,#0c4a6e 55%,#1e3a8a 100%)",
  },
  {
    id: "grape",
    name: "Grape",
    light: "linear-gradient(135deg,#ddd6fe 0%,#f0abfc 52%,#f9a8d4 100%)",
    dark: "linear-gradient(135deg,#1e1b4b 0%,#581c87 55%,#9d174d 100%)",
  },
  {
    id: "citrus",
    name: "Citrus",
    light: "linear-gradient(135deg,#fde047 0%,#bef264 48%,#5eead4 100%)",
    dark: "linear-gradient(135deg,#1c1917 0%,#3f6212 55%,#0f766e 100%)",
  },
  {
    id: "candy",
    name: "Candy",
    light: "linear-gradient(135deg,#f9a8d4 0%,#c4b5fd 52%,#93c5fd 100%)",
    dark: "linear-gradient(135deg,#3b0764 0%,#701a75 55%,#155e75 100%)",
  },
  {
    id: "meadow",
    name: "Meadow",
    light: "linear-gradient(135deg,#bbf7d0 0%,#a7f3d0 50%,#bae6fd 100%)",
    dark: "linear-gradient(135deg,#022c22 0%,#065f46 55%,#164e63 100%)",
  },
  {
    id: "ember",
    name: "Ember",
    light: "linear-gradient(135deg,#fecaca 0%,#fdba74 52%,#fde68a 100%)",
    dark: "linear-gradient(135deg,#200b0b 0%,#7c2d12 55%,#9a3412 100%)",
  },
  {
    id: "slate",
    name: "Slate",
    light: "linear-gradient(135deg,#f8fafc 0%,#e2e8f0 55%,#cbd5e1 100%)",
    dark: "linear-gradient(135deg,#020617 0%,#0f172a 55%,#111827 100%)",
  },
];

export const ACCENTS: string[] = [
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#e11d48",
  "#16a34a",
  "#0d9488",
  "#0284c7",
  "#ca8a04",
];

export const FONT_STACKS: Record<FontChoice, string> = {
  sans: "var(--font-inter)",
  serif: "var(--font-lora)",
  mono: "var(--font-jetbrains)",
  rounded: "var(--font-nunito)",
};

export const FONT_LABELS: Record<FontChoice, string> = {
  sans: "Inter",
  serif: "Lora",
  mono: "JetBrains",
  rounded: "Nunito",
};

export const DEFAULT_THEME: Theme = {
  mode: "light",
  preset: "sunrise",
  custom: { from: "#f472b6", to: "#8b5cf6", angle: 135 },
  accent: "#7c3aed",
  font: "sans",
  grain: true,
};

export function resolveBackground(theme: Theme): string {
  if (theme.preset === "custom") {
    return `linear-gradient(${theme.custom.angle}deg, ${theme.custom.from}, ${theme.custom.to})`;
  }
  const preset = BG_PRESETS.find((p) => p.id === theme.preset) ?? BG_PRESETS[0];
  return theme.mode === "dark" ? preset.dark : preset.light;
}

export function presetCss(id: string | null | undefined): string | null {
  if (!id) return null;
  const preset = BG_PRESETS.find((p) => p.id === id);
  return preset ? preset.light : null;
}
