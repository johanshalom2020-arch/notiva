"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CloudCheck,
  Copy,
  GripVertical,
  ImagePlus,
  Lightbulb,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  createBlockAction,
  deleteBlockAction,
  reorderBlocksAction,
  updateBlockAction,
  updatePageAction,
} from "@/lib/actions";
import {
  BG_COLORS,
  BLOCK_TYPES,
  COLOR_TOKENS,
  TEXT_COLORS,
  isEditableType,
  isListType,
  type EditableBlock,
} from "@/lib/blocks";
import { PAGE_ICONS, getPageIcon } from "@/lib/icons";
import { BG_PRESETS, presetCss } from "@/lib/theme";

type PageProp = { id: string; title: string; icon: string; cover: string | null };
type BlockProp = {
  id: string;
  type: string;
  content: string;
  checked: boolean;
  color: string;
  bg: string;
  position: number;
};

const byPos = (a: EditableBlock, b: EditableBlock) => a.position - b.position;

const PLACEHOLDERS: Record<string, string> = {
  text: "Write something, or press / for commands",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  todo: "To-do",
  bullet: "List item",
  numbered: "List item",
  quote: "Quote",
  callout: "Callout",
};

const TYPE_CLASSES: Record<string, string> = {
  text: "text-[15.5px]",
  h1: "text-[29px] font-bold tracking-tight leading-[1.25]",
  h2: "text-[23px] font-bold tracking-tight leading-[1.3]",
  h3: "text-[18px] font-semibold",
  todo: "text-[15.5px]",
  bullet: "text-[15.5px]",
  numbered: "text-[15.5px]",
  quote: "text-[16.5px] italic",
  callout: "text-[15px]",
};

const ROW_SPACING: Record<string, string> = {
  h1: "pt-7 pb-1",
  h2: "pt-5 pb-0.5",
  h3: "pt-4 pb-0.5",
  quote: "py-1.5",
  callout: "py-1.5",
  divider: "py-2.5",
};

type SlashState = { blockId: string; filter: string } | null;

function filterSlash(filter: string) {
  const f = filter.toLowerCase();
  return BLOCK_TYPES.filter(
    (t) => t.label.toLowerCase().includes(f) || t.type.includes(f),
  );
}

/* --------------------------------- block row ------------------------------- */

type RowApi = {
  registerRef: (id: string, el: HTMLTextAreaElement | null) => void;
  onContentChange: (block: EditableBlock, value: string) => void;
  onEnter: (block: EditableBlock, caret: number) => void;
  onBackspaceAtStart: (block: EditableBlock) => void;
  onArrow: (block: EditableBlock, dir: "up" | "down", caret: number) => void;
  onToggleChecked: (block: EditableBlock) => void;
  onAddBelow: (block: EditableBlock) => void;
  onTurnInto: (block: EditableBlock, type: string, keepContent: boolean) => void;
  onSetColor: (block: EditableBlock, color: string) => void;
  onSetBg: (block: EditableBlock, bg: string) => void;
  onDuplicate: (block: EditableBlock) => void;
  onDelete: (block: EditableBlock) => void;
  onMove: (block: EditableBlock, dir: -1 | 1) => void;
  closeSlash: () => void;
};

function BlockRow({
  block,
  number,
  slash,
  menuOpen,
  setMenuOpen,
  api,
}: {
  block: EditableBlock;
  number: number | null;
  slash: { blockId: string; filter: string } | null;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  api: RowApi;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });
  const localRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = localRef.current;
    if (el) {
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [block.content, block.type]);

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const textColor = TEXT_COLORS[block.color] || undefined;
  const bgTint = BG_COLORS[block.bg] || undefined;
  const slashOpen = slash?.blockId === block.id;
  const slashItems = slashOpen ? filterSlash(slash!.filter) : [];

  const textarea = (
    <textarea
      ref={(el) => {
        localRef.current = el;
        api.registerRef(block.id, el);
      }}
      rows={1}
      value={block.content}
      spellCheck={false}
      placeholder={PLACEHOLDERS[block.type] ?? "Type something"}
      onChange={(e) => api.onContentChange(block, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          api.onEnter(block, e.currentTarget.selectionStart ?? block.content.length);
        } else if (e.key === "Backspace") {
          const el = e.currentTarget;
          if (el.selectionStart === 0 && el.selectionEnd === 0) {
            e.preventDefault();
            api.onBackspaceAtStart(block);
          }
        } else if (e.key === "ArrowUp") {
          if (e.currentTarget.selectionStart === 0) {
            e.preventDefault();
            api.onArrow(block, "up", e.currentTarget.selectionStart);
          }
        } else if (e.key === "ArrowDown") {
          const el = e.currentTarget;
          if (el.selectionEnd === el.value.length) {
            e.preventDefault();
            api.onArrow(block, "down", el.selectionEnd);
          }
        } else if (e.key === "Escape") {
          api.closeSlash();
          setMenuOpen(false);
        }
      }}
      className={`block-input ${TYPE_CLASSES[block.type] ?? TYPE_CLASSES.text} ${
        block.type === "todo" && block.checked ? "opacity-50 line-through" : ""
      }`}
    />
  );

  let body: ReactNode = textarea;
  if (block.type === "todo") {
    body = (
      <div className="flex items-start gap-2.5">
        <button
          onClick={() => api.onToggleChecked(block)}
          aria-label={block.checked ? "Mark as not done" : "Mark as done"}
          className={`mt-[4px] grid size-[19px] shrink-0 place-items-center rounded-[6px] border-2 transition ${
            block.checked
              ? "border-[var(--accent)] bg-[var(--accent)]"
              : "border-slate-400/70 hover:border-[var(--accent)] dark:border-neutral-500"
          }`}
        >
          {block.checked && <Check size={12} strokeWidth={3.5} className="text-white" />}
        </button>
        <div className="min-w-0 flex-1">{textarea}</div>
      </div>
    );
  } else if (block.type === "bullet") {
    body = (
      <div className="flex items-start gap-3.5 pl-0.5">
        <span className="mt-[11px] size-[5px] shrink-0 rounded-full bg-current" />
        <div className="min-w-0 flex-1">{textarea}</div>
      </div>
    );
  } else if (block.type === "numbered") {
    body = (
      <div className="flex items-start gap-2.5">
        <span className="mt-[3px] w-6 shrink-0 text-right text-[15px] tabular-nums text-slate-400 dark:text-neutral-500">
          {number}.
        </span>
        <div className="min-w-0 flex-1">{textarea}</div>
      </div>
    );
  } else if (block.type === "quote") {
    body = (
      <div className="border-l-[3px] border-[var(--accent)] pl-4 text-slate-700 dark:text-neutral-300">
        {textarea}
      </div>
    );
  } else if (block.type === "callout") {
    body = (
      <div className="flex items-start gap-3 rounded-xl bg-[color-mix(in_srgb,var(--accent)_11%,transparent)] px-4 py-3 ring-1 ring-[color-mix(in_srgb,var(--accent)_22%,transparent)]">
        <span className="mt-[3px] shrink-0 text-[var(--accent)]">
          <Lightbulb size={17} />
        </span>
        <div className="min-w-0 flex-1">{textarea}</div>
      </div>
    );
  } else if (block.type === "divider") {
    body = (
      <div className="py-1">
        <hr className="border-t border-slate-300/80 dark:border-neutral-600/60" />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg ${ROW_SPACING[block.type] ?? "py-[2px]"} ${
        isDragging ? "z-40 opacity-50" : ""
      }`}
    >
      {/* hover controls */}
      <div className="absolute -left-[54px] top-0 flex items-center gap-0.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
        <button
          onClick={() => api.onAddBelow(block)}
          aria-label="Add block below"
          className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-black/[0.06] hover:text-slate-600 dark:text-neutral-500 dark:hover:bg-white/10 dark:hover:text-neutral-200"
        >
          <Plus size={16} />
        </button>
        <button
          {...attributes}
          {...listeners}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Drag or open block menu"
          className="grid size-6 cursor-grab place-items-center rounded-md text-slate-400 hover:bg-black/[0.06] hover:text-slate-600 active:cursor-grabbing dark:text-neutral-500 dark:hover:bg-white/10 dark:hover:text-neutral-200"
        >
          <GripVertical size={16} />
        </button>
      </div>

      <div
        style={{
          color: textColor,
          backgroundColor: bgTint,
          borderRadius: bgTint ? 8 : undefined,
          padding: bgTint ? "2px 6px" : undefined,
          margin: bgTint ? "-2px -6px" : undefined,
        }}
      >
        {body}
      </div>

      {/* slash command menu */}
      {slashOpen && slashItems.length > 0 && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-2xl bg-white/95 p-1.5 shadow-2xl ring-1 ring-slate-900/10 backdrop-blur-xl dark:bg-neutral-900/95 dark:ring-white/10">
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Turn into
          </p>
          {slashItems.map((item, i) => (
            <button
              key={item.type}
              onClick={() => api.onTurnInto(block, item.type, false)}
              className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left ${
                i === 0
                  ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                  : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              }`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                <item.Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-slate-800 dark:text-neutral-100">
                  {item.label}
                </span>
                <span className="block truncate text-[11.5px] text-slate-400">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* block menu */}
      {menuOpen && (
        <div className="absolute -left-2 top-full z-30 mt-1 w-60 rounded-2xl bg-white/95 p-2 shadow-2xl ring-1 ring-slate-900/10 backdrop-blur-xl dark:bg-neutral-900/95 dark:ring-white/10">
          <p className="px-1.5 pb-1 pt-0.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Turn into
          </p>
          <div className="grid grid-cols-5 gap-1">
            {BLOCK_TYPES.map((item) => (
              <button
                key={item.type}
                title={item.label}
                onClick={() => api.onTurnInto(block, item.type, true)}
                className={`grid size-9 place-items-center rounded-lg transition ${
                  block.type === item.type
                    ? "bg-[var(--accent)] text-white"
                    : "text-slate-500 hover:bg-black/[0.05] dark:text-neutral-400 dark:hover:bg-white/10"
                }`}
              >
                <item.Icon size={15} />
              </button>
            ))}
          </div>

          <p className="px-1.5 pb-1 pt-2.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Text color
          </p>
          <div className="flex flex-wrap gap-1.5 px-1">
            {COLOR_TOKENS.map((token) => (
              <button
                key={token || "default"}
                title={token || "Default"}
                onClick={() => api.onSetColor(block, token)}
                className={`grid size-6 place-items-center rounded-full ring-2 transition ${
                  block.color === token ? "ring-[var(--accent)]" : "ring-black/10 dark:ring-white/15"
                }`}
                style={{ background: TEXT_COLORS[token] || undefined }}
              >
                {!token && <X size={11} className="text-slate-400" />}
              </button>
            ))}
          </div>

          <p className="px-1.5 pb-1 pt-2.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Background
          </p>
          <div className="flex flex-wrap gap-1.5 px-1">
            {COLOR_TOKENS.map((token) => (
              <button
                key={token || "default"}
                title={token || "None"}
                onClick={() => api.onSetBg(block, token)}
                className={`grid size-6 place-items-center rounded-full ring-2 transition ${
                  block.bg === token ? "ring-[var(--accent)]" : "ring-black/10 dark:ring-white/15"
                }`}
                style={{ background: BG_COLORS[token] || undefined }}
              >
                {!token && <X size={11} className="text-slate-400" />}
              </button>
            ))}
          </div>

          <div className="mt-2.5 space-y-0.5 border-t border-black/[0.06] pt-2 dark:border-white/10">
            {[
              { label: "Duplicate", Icon: Copy, fn: () => api.onDuplicate(block) },
              { label: "Move up", Icon: ArrowUp, fn: () => api.onMove(block, -1) },
              { label: "Move down", Icon: ArrowDown, fn: () => api.onMove(block, 1) },
            ].map((action) => (
              <button
                key={action.label}
                onClick={action.fn}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-black/[0.04] dark:text-neutral-300 dark:hover:bg-white/[0.06]"
              >
                <action.Icon size={14} /> {action.label}
              </button>
            ))}
            <button
              onClick={() => api.onDelete(block)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-rose-500 hover:bg-rose-500/10"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- editor --------------------------------- */

export function PageEditor({
  page,
  initialBlocks,
}: {
  page: PageProp;
  initialBlocks: BlockProp[];
}) {
  const [meta, setMeta] = useState({
    title: page.title,
    icon: page.icon,
    cover: page.cover,
  });
  const [blocks, setBlocks] = useState<EditableBlock[]>(() =>
    initialBlocks
      .map((b) => ({
        id: b.id,
        type: b.type,
        content: b.content,
        checked: b.checked,
        color: b.color,
        bg: b.bg,
        position: b.position,
      }))
      .sort(byPos),
  );
  const [slash, setSlash] = useState<SlashState>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const inputRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  /* ------------------------------ persistence ----------------------------- */

  const schedule = useCallback(
    (key: string, fn: () => Promise<unknown>, ms = 500) => {
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);
      else {
        pending.current += 1;
        setSaving(true);
      }
      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key);
          void fn().finally(() => {
            pending.current -= 1;
            if (pending.current <= 0) {
              pending.current = 0;
              setSaving(false);
            }
          });
        }, ms),
      );
    },
    [],
  );

  const persistBlock = useCallback(
    (id: string, patch: Parameters<typeof updateBlockAction>[1], ms = 550) => {
      schedule(`block:${id}`, () => updateBlockAction(id, patch), ms);
    },
    [schedule],
  );

  const persistPage = useCallback(
    (patch: Parameters<typeof updatePageAction>[1]) => {
      schedule(`page:${page.id}`, () => updatePageAction(page.id, patch), 600);
    },
    [page.id, schedule],
  );

  /* ------------------------------- utilities ------------------------------ */

  const registerRef = useCallback((id: string, el: HTMLTextAreaElement | null) => {
    if (el) inputRefs.current.set(id, el);
    else inputRefs.current.delete(id);
  }, []);

  const focusBlock = useCallback((id: string, pos: number | "end" = "end") => {
    requestAnimationFrame(() => {
      const el = inputRefs.current.get(id);
      if (!el) return;
      el.focus();
      const p = pos === "end" ? el.value.length : Math.min(pos, el.value.length);
      el.setSelectionRange(p, p);
    });
  }, []);

  const patchBlock = useCallback((id: string, patch: Partial<EditableBlock>) => {
    setBlocks((cur) => cur.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const insertCreated = useCallback(
    (created: BlockProp) => {
      const editable: EditableBlock = {
        id: created.id,
        type: created.type,
        content: created.content,
        checked: created.checked,
        color: created.color,
        bg: created.bg,
        position: created.position,
      };
      setBlocks((cur) => [...cur, editable].sort(byPos));
      return editable;
    },
    [],
  );

  /* -------------------------------- handlers ------------------------------ */

  const handleContentChange = useCallback(
    (block: EditableBlock, value: string) => {
      setSlash((cur) => {
        if (value === "/") return { blockId: block.id, filter: "" };
        if (cur?.blockId === block.id) {
          if (value.startsWith("/")) return { blockId: block.id, filter: value.slice(1) };
          return null;
        }
        return cur;
      });
      patchBlock(block.id, { content: value });
      schedule(`block:${block.id}`, () => updateBlockAction(block.id, { content: value }));
    },
    [patchBlock, schedule],
  );

  const handleTurnInto = useCallback(
    (block: EditableBlock, type: string, keepContent: boolean) => {
      const content = keepContent ? block.content : "";
      patchBlock(block.id, { type, content, checked: type === "todo" ? block.checked : false });
      persistBlock(block.id, { type, content }, 250);
      setSlash(null);
      setMenuFor(null);
      if (isEditableType(type)) focusBlock(block.id, "end");
    },
    [focusBlock, patchBlock, persistBlock],
  );

  const handleEnter = useCallback(
    async (block: EditableBlock, caret: number) => {
      // slash menu open → Enter picks the first match
      if (slash?.blockId === block.id) {
        const match = filterSlash(slash.filter)[0];
        setSlash(null);
        if (match) {
          handleTurnInto(block, match.type, false);
        }
        return;
      }

      if (isListType(block.type) && block.content === "") {
        handleTurnInto(block, "text", true);
        return;
      }
      const before = block.content.slice(0, caret);
      const after = block.content.slice(caret);
      patchBlock(block.id, { content: before });
      persistBlock(block.id, { content: before }, 200);
      const nextType = isListType(block.type) ? block.type : "text";
      const created = await createBlockAction(page.id, {
        type: nextType,
        content: after,
        position: block.position + 1,
      });
      insertCreated(created);
      focusBlock(created.id, 0);
    },
    [slash, handleTurnInto, patchBlock, persistBlock, page.id, insertCreated, focusBlock],
  );

  const handleBackspaceAtStart = useCallback(
    async (block: EditableBlock) => {
      setSlash(null);
      const idx = blocks.findIndex((b) => b.id === block.id);
      const prev = blocks[idx - 1];
      if (!prev) return;
      if (block.content === "") {
        setBlocks((cur) => cur.filter((b) => b.id !== block.id));
        await deleteBlockAction(block.id);
        focusBlock(prev.id, "end");
        return;
      }
      if (isEditableType(prev.type)) {
        const cut = prev.content.length;
        const merged = prev.content + block.content;
        patchBlock(prev.id, { content: merged });
        persistBlock(prev.id, { content: merged }, 200);
        setBlocks((cur) => cur.filter((b) => b.id !== block.id));
        await deleteBlockAction(block.id);
        focusBlock(prev.id, cut);
      }
    },
    [blocks, patchBlock, persistBlock, focusBlock],
  );

  const handleArrow = useCallback(
    (block: EditableBlock, dir: "up" | "down", caret: number) => {
      const idx = blocks.findIndex((b) => b.id === block.id);
      const target = blocks[dir === "up" ? idx - 1 : idx + 1];
      if (target && isEditableType(target.type)) focusBlock(target.id, caret);
    },
    [blocks, focusBlock],
  );

  const handleToggleChecked = useCallback(
    (block: EditableBlock) => {
      const checked = !block.checked;
      patchBlock(block.id, { checked });
      schedule(`block:${block.id}`, () => updateBlockAction(block.id, { checked }), 250);
    },
    [patchBlock, schedule],
  );

  const handleAddBelow = useCallback(
    async (block: EditableBlock) => {
      const created = await createBlockAction(page.id, {
        type: block.type === "divider" ? "text" : isListType(block.type) ? block.type : "text",
        position: block.position + 1,
      });
      insertCreated(created);
      focusBlock(created.id, 0);
    },
    [page.id, insertCreated, focusBlock],
  );

  const handleAppendAtEnd = useCallback(async () => {
    const created = await createBlockAction(page.id, { type: "text" });
    insertCreated(created);
    focusBlock(created.id, 0);
  }, [page.id, insertCreated, focusBlock]);

  const handleDelete = useCallback(
    async (block: EditableBlock) => {
      setMenuFor(null);
      setBlocks((cur) => cur.filter((b) => b.id !== block.id));
      await deleteBlockAction(block.id);
    },
    [],
  );

  const handleDuplicate = useCallback(
    async (block: EditableBlock) => {
      setMenuFor(null);
      const created = await createBlockAction(page.id, {
        type: block.type,
        content: block.content,
        color: block.color,
        bg: block.bg,
        position: block.position + 1,
      });
      insertCreated(created);
    },
    [page.id, insertCreated],
  );

  const commitReorder = useCallback(
    (next: EditableBlock[]) => {
      const normalized = next.map((b, i) => ({ ...b, position: i }));
      setBlocks(normalized);
      schedule(
        "reorder",
        () => reorderBlocksAction(page.id, normalized.map((b) => b.id)),
        250,
      );
    },
    [page.id, schedule],
  );

  const handleMove = useCallback(
    (block: EditableBlock, dir: -1 | 1) => {
      setMenuFor(null);
      const idx = blocks.findIndex((b) => b.id === block.id);
      const swapWith = idx + dir;
      if (swapWith < 0 || swapWith >= blocks.length) return;
      const next = [...blocks];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      commitReorder(next);
    },
    [blocks, commitReorder],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const from = blocks.findIndex((b) => b.id === String(active.id));
      const to = blocks.findIndex((b) => b.id === String(over.id));
      if (from < 0 || to < 0) return;
      commitReorder(arrayMove(blocks, from, to));
    },
    [blocks, commitReorder],
  );

  const handleSetColor = useCallback(
    (block: EditableBlock, color: string) => {
      patchBlock(block.id, { color });
      persistBlock(block.id, { color }, 250);
      setMenuFor(null);
    },
    [patchBlock, persistBlock],
  );

  const handleSetBg = useCallback(
    (block: EditableBlock, bg: string) => {
      patchBlock(block.id, { bg });
      persistBlock(block.id, { bg }, 250);
      setMenuFor(null);
    },
    [patchBlock, persistBlock],
  );

  // close popovers when clicking anywhere on the backdrop
  const anyPopover = slash !== null || menuFor !== null || iconPickerOpen || coverPickerOpen;

  /* --------------------------------- header -------------------------------- */

  const PageIcon = getPageIcon(meta.icon);
  const coverCss = presetCss(meta.cover);

  const numbers = new Map<string, number>();
  {
    let n = 0;
    for (const b of blocks) {
      if (b.type === "numbered") {
        n += 1;
        numbers.set(b.id, n);
      } else {
        n = 0;
      }
    }
  }

  const api: RowApi = {
    registerRef,
    onContentChange: handleContentChange,
    onEnter: (block, caret) => void handleEnter(block, caret),
    onBackspaceAtStart: (block) => void handleBackspaceAtStart(block),
    onArrow: handleArrow,
    onToggleChecked: handleToggleChecked,
    onAddBelow: (block) => void handleAddBelow(block),
    onTurnInto: handleTurnInto,
    onSetColor: handleSetColor,
    onSetBg: handleSetBg,
    onDuplicate: (block) => void handleDuplicate(block),
    onDelete: (block) => void handleDelete(block),
    onMove: handleMove,
    closeSlash: () => setSlash(null),
  };

  return (
    <div className="mx-auto w-full max-w-[900px]">
      {anyPopover && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setSlash(null);
            setMenuFor(null);
            setIconPickerOpen(false);
            setCoverPickerOpen(false);
          }}
        />
      )}

      <div className="relative rounded-[26px] border border-white/50 bg-white/75 pb-16 pt-3 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-950/60">
        {/* save status */}
        <div className="pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1.5 text-[11px] font-bold text-slate-500 backdrop-blur dark:bg-white/10 dark:text-neutral-300">
          {saving ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Saving
            </>
          ) : (
            <>
              <CloudCheck size={13} className="text-emerald-500" /> Saved
            </>
          )}
        </div>

        {/* cover */}
        {coverCss && (
          <div
            className="mx-3 h-32 rounded-2xl bg-cover shadow-inner md:h-44"
            style={{ backgroundImage: coverCss }}
          />
        )}

        <header className={`relative px-8 md:px-[72px] ${coverCss ? "-mt-8" : "pt-10"}`}>
          <div className="flex items-end justify-between">
            <div className="relative">
              <button
                onClick={() => {
                  setIconPickerOpen((v) => !v);
                  setCoverPickerOpen(false);
                }}
                aria-label="Change page icon"
                className="grid size-16 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_14%,white)] text-[var(--accent)] shadow-lg ring-1 ring-black/5 transition hover:scale-105 dark:bg-[color-mix(in_srgb,var(--accent)_20%,black)] dark:ring-white/10"
              >
                <PageIcon size={30} />
              </button>
              {iconPickerOpen && (
                <div className="absolute left-0 top-full z-30 mt-2 w-[304px] rounded-2xl bg-white/95 p-2.5 shadow-2xl ring-1 ring-slate-900/10 backdrop-blur-xl dark:bg-neutral-900/95 dark:ring-white/10">
                  <div className="grid grid-cols-8 gap-1">
                    {PAGE_ICONS.map((entry) => (
                      <button
                        key={entry.key}
                        title={entry.label}
                        onClick={() => {
                          setMeta((m) => ({ ...m, icon: entry.key }));
                          persistPage({ icon: entry.key });
                          setIconPickerOpen(false);
                        }}
                        className={`grid size-8 place-items-center rounded-lg transition ${
                          meta.icon === entry.key
                            ? "bg-[var(--accent)] text-white"
                            : "text-slate-500 hover:bg-black/[0.06] dark:text-neutral-400 dark:hover:bg-white/10"
                        }`}
                      >
                        <entry.Icon size={15} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative flex items-center gap-1.5 pb-1">
              <button
                onClick={() => {
                  setCoverPickerOpen((v) => !v);
                  setIconPickerOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-slate-400 transition hover:bg-black/[0.05] hover:text-slate-600 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-neutral-200"
              >
                <ImagePlus size={14} /> {coverCss ? "Replace cover" : "Add cover"}
              </button>
              {coverCss && (
                <button
                  onClick={() => {
                    setMeta((m) => ({ ...m, cover: null }));
                    persistPage({ cover: null });
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-slate-400 transition hover:bg-black/[0.05] hover:text-slate-600 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-neutral-200"
                >
                  <X size={14} /> Remove
                </button>
              )}
              {coverPickerOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-[280px] rounded-2xl bg-white/95 p-3 shadow-2xl ring-1 ring-slate-900/10 backdrop-blur-xl dark:bg-neutral-900/95 dark:ring-white/10">
                  <p className="pb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Page cover
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {BG_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        title={preset.name}
                        onClick={() => {
                          setMeta((m) => ({ ...m, cover: preset.id }));
                          persistPage({ cover: preset.id });
                          setCoverPickerOpen(false);
                        }}
                        className={`h-12 rounded-xl shadow-sm ring-2 transition hover:scale-105 ${
                          meta.cover === preset.id ? "ring-[var(--accent)]" : "ring-black/5 dark:ring-white/10"
                        }`}
                        style={{ backgroundImage: preset.light }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <textarea
            rows={1}
            value={meta.title}
            placeholder="Untitled"
            spellCheck={false}
            onChange={(e) => {
              const title = e.target.value;
              setMeta((m) => ({ ...m, title }));
              persistPage({ title: title || "Untitled" });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (blocks[0]) focusBlock(blocks[0].id, 0);
                else void handleAppendAtEnd();
              }
            }}
            ref={(el) => {
              if (el) {
                el.style.height = "0px";
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            className="block-input title-input mt-4 text-[38px] md:text-[42px]"
          />
        </header>

        <section className="mt-4 px-8 md:px-[72px]">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {blocks.map((block) => (
                <BlockRow
                  key={block.id}
                  block={block}
                  number={numbers.get(block.id) ?? null}
                  slash={slash}
                  menuOpen={menuFor === block.id}
                  setMenuOpen={(open) => setMenuFor(open ? block.id : null)}
                  api={api}
                />
              ))}
            </SortableContext>
          </DndContext>

          <button
            onClick={() => void handleAppendAtEnd()}
            className="mt-2 flex min-h-[120px] w-full cursor-text items-start justify-center rounded-xl pt-4 text-[13px] font-medium text-slate-300 transition hover:text-slate-400 dark:text-neutral-600 dark:hover:text-neutral-400"
          >
            {blocks.length === 0 ? "Click anywhere to start writing — or press / for commands" : ""}
          </button>
        </section>
      </div>
    </div>
  );
}
