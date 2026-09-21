import {
  Heading1,
  Heading2,
  Heading3,
  Lightbulb,
  List,
  ListOrdered,
  Minus,
  SquareCheckBig,
  TextQuote,
  Type,
  type LucideIcon,
} from "lucide-react";

export type BlockType =
  | "text"
  | "h1"
  | "h2"
  | "h3"
  | "todo"
  | "bullet"
  | "numbered"
  | "quote"
  | "callout"
  | "divider";

export type BlockTypeMeta = {
  type: BlockType;
  label: string;
  hint: string;
  Icon: LucideIcon;
};

export const BLOCK_TYPES: BlockTypeMeta[] = [
  { type: "text", label: "Text", hint: "Plain writing block", Icon: Type },
  { type: "h1", label: "Heading 1", hint: "Big section title", Icon: Heading1 },
  { type: "h2", label: "Heading 2", hint: "Medium section title", Icon: Heading2 },
  { type: "h3", label: "Heading 3", hint: "Small section title", Icon: Heading3 },
  { type: "todo", label: "To-do", hint: "Task with a checkbox", Icon: SquareCheckBig },
  { type: "bullet", label: "Bulleted list", hint: "Simple list of things", Icon: List },
  { type: "numbered", label: "Numbered list", hint: "Ordered list of things", Icon: ListOrdered },
  { type: "quote", label: "Quote", hint: "Highlighted quotation", Icon: TextQuote },
  { type: "callout", label: "Callout", hint: "Accent-tinted info box", Icon: Lightbulb },
  { type: "divider", label: "Divider", hint: "Horizontal rule", Icon: Minus },
];

export const LIST_TYPES: BlockType[] = ["todo", "bullet", "numbered"];

export function isListType(type: string): boolean {
  return LIST_TYPES.includes(type as BlockType);
}

export function isEditableType(type: string): boolean {
  return type !== "divider";
}

/** token -> css color. Empty string means "default". */
export const TEXT_COLORS: Record<string, string> = {
  "": "",
  red: "#dc2626",
  orange: "#ea580c",
  amber: "#d97706",
  green: "#16a34a",
  blue: "#2563eb",
  purple: "#9333ea",
  pink: "#db2777",
  gray: "#8a8f9c",
};

/** token -> translucent tint that works on light AND dark panels */
export const BG_COLORS: Record<string, string> = {
  "": "",
  red: "color-mix(in srgb, #ef4444 18%, transparent)",
  orange: "color-mix(in srgb, #f97316 18%, transparent)",
  amber: "color-mix(in srgb, #f59e0b 20%, transparent)",
  green: "color-mix(in srgb, #22c55e 18%, transparent)",
  blue: "color-mix(in srgb, #3b82f6 18%, transparent)",
  purple: "color-mix(in srgb, #a855f7 18%, transparent)",
  pink: "color-mix(in srgb, #ec4899 18%, transparent)",
  gray: "color-mix(in srgb, #6b7280 20%, transparent)",
};

export const COLOR_TOKENS = ["", "red", "orange", "amber", "green", "blue", "purple", "pink", "gray"];

export type EditableBlock = {
  id: string;
  type: string;
  content: string;
  checked: boolean;
  color: string;
  bg: string;
  position: number;
};

export type PageMeta = {
  id: string;
  title: string;
  icon: string;
  cover: string | null;
  sortOrder: number;
  favorite: boolean;
};
