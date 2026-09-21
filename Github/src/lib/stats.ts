export type SubjectRow = {
  id: string;
  name: string;
  color: string;
  target: number;
  sortOrder: number;
};

export type AssessmentRow = {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  title: string;
  kind: string;
  score: number;
  date: string; // YYYY-MM-DD
  notes: string;
};

export const SUBJECT_COLORS = [
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#0284c7",
  "#0d9488",
  "#4f46e5",
  "#ca8a04",
  "#e11d48",
  "#9333ea",
];

export type AssessmentKind = {
  id: string;
  label: string;
  short: string;
};

export const ASSESSMENT_KINDS: AssessmentKind[] = [
  { id: "sac", label: "SAC", short: "SAC" },
  { id: "exam", label: "Exam", short: "Exam" },
  { id: "test", label: "Test", short: "Test" },
  { id: "quiz", label: "Quiz", short: "Quiz" },
  { id: "assignment", label: "Assignment", short: "Assign." },
  { id: "other", label: "Other", short: "Other" },
];

export function kindLabel(kind: string): string {
  return ASSESSMENT_KINDS.find((k) => k.id === kind)?.label ?? "Other";
}

/** Color-coded performance: 90+ great, 75+ solid, 60+ ok, below is at risk. */
export function scoreColor(score: number): string {
  if (score >= 90) return "#10b981";
  if (score >= 75) return "#0ea5e9";
  if (score >= 60) return "#f59e0b";
  return "#f43f5e";
}

export function average(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type SubjectStats = {
  subject: SubjectRow;
  items: AssessmentRow[]; // ascending by date
  count: number;
  avg: number | null;
  best: number | null;
  last: AssessmentRow | null;
  /** last score minus subject average → direction of travel */
  trend: number | null;
};

export function computeSubjectStats(
  subjects: SubjectRow[],
  assessments: AssessmentRow[],
): SubjectStats[] {
  return subjects.map((subject) => {
    const items = assessments
      .filter((a) => a.subjectId === subject.id)
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const avg = average(items.map((i) => i.score));
    const last = items[items.length - 1] ?? null;
    return {
      subject,
      items,
      count: items.length,
      avg,
      best: items.length ? Math.max(...items.map((i) => i.score)) : null,
      last,
      trend: last != null && avg != null && items.length > 1 ? last.score - avg : null,
    };
  });
}

export function overallStats(assessments: AssessmentRow[]) {
  const avg = average(assessments.map((a) => a.score));
  return {
    count: assessments.length,
    avg,
    best: assessments.length ? Math.max(...assessments.map((a) => a.score)) : null,
  };
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
