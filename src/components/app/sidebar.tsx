"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Check,
  LayoutDashboard,
  ListChecks,
  Loader2,
  LogOut,
  Palette,
  PenSquare,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { createPageAction, deletePageAction, updatePageAction } from "@/lib/actions";
import { signOutAction } from "@/lib/auth-actions";
import { getPageIcon } from "@/lib/icons";
import type { PageMeta } from "@/lib/blocks";
import { CloseButton } from "./app-shell";

function PageRow({
  page,
  active,
  confirmDelete,
  onAskDelete,
  onCancelDelete,
  onDelete,
  onToggleFavorite,
  onNavigate,
}: {
  page: PageMeta;
  active: boolean;
  confirmDelete: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onNavigate?: () => void;
}) {
  const Icon = getPageIcon(page.icon);
  return (
    <div
      className={`group relative flex items-center gap-2 rounded-xl px-2.5 py-[7px] text-[13.5px] font-medium transition ${
        active
          ? "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-slate-900 dark:text-white"
          : "text-slate-600 hover:bg-black/[0.045] dark:text-neutral-300 dark:hover:bg-white/[0.06]"
      }`}
    >
      <Link href={`/app/p/${page.id}`} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={`grid size-[26px] shrink-0 place-items-center rounded-lg ${
            active ? "bg-[var(--accent)] text-white" : "bg-black/[0.05] text-slate-500 dark:bg-white/10 dark:text-neutral-300"
          }`}
        >
          <Icon size={14} />
        </span>
        <span className="truncate">{page.title || "Untitled"}</span>
        {page.favorite && <Star size={11} className="shrink-0 fill-amber-400 text-amber-400" />}
      </Link>

      {confirmDelete ? (
        <span className="flex shrink-0 items-center gap-1">
          <button
            onClick={onDelete}
            aria-label="Confirm delete"
            className="grid size-6 place-items-center rounded-md bg-rose-500 text-white hover:bg-rose-600"
          >
            <Check size={13} strokeWidth={3} />
          </button>
          <button
            onClick={onCancelDelete}
            aria-label="Cancel delete"
            className="grid size-6 place-items-center rounded-md bg-black/5 text-slate-500 hover:bg-black/10 dark:bg-white/10 dark:text-neutral-300"
          >
            <X size={13} strokeWidth={3} />
          </button>
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={onToggleFavorite}
            aria-label="Toggle favorite"
            className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-black/5 hover:text-amber-500 dark:hover:bg-white/10"
          >
            <Star size={13} className={page.favorite ? "fill-amber-400 text-amber-400" : ""} />
          </button>
          <button
            onClick={onAskDelete}
            aria-label="Delete page"
            className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-black/5 hover:text-rose-500 dark:hover:bg-white/10"
          >
            <Trash2 size={13} />
          </button>
        </span>
      )}
    </div>
  );
}

export function Sidebar({
  pages,
  user,
  onNavigate,
  onClose,
}: {
  pages: PageMeta[];
  user: { name: string; email: string };
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [list, setList] = useState<PageMeta[]>(pages);
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setList((current) =>
      JSON.stringify(current) === JSON.stringify(pages) ? current : pages,
    );
  }, [pages]);

  const filtered = query
    ? list.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
    : list;
  const favorites = filtered.filter((p) => p.favorite);

  async function handleCreate() {
    setCreating(true);
    try {
      const page = await createPageAction();
      router.push(`/app/p/${page.id}`);
      router.refresh();
      onNavigate?.();
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    await deletePageAction(id);
    setConfirmId(null);
    setList((cur) => cur.filter((p) => p.id !== id));
    if (pathname === `/app/p/${id}`) {
      const remaining = list.filter((p) => p.id !== id);
      router.push(remaining.length ? `/app/p/${remaining[0].id}` : "/app");
      router.refresh();
    }
  }

  async function handleFavorite(page: PageMeta) {
    setList((cur) => cur.map((p) => (p.id === page.id ? { ...p, favorite: !p.favorite } : p)));
    await updatePageAction(page.id, { favorite: !page.favorite });
  }

  const navItem = (
    href: string,
    label: string,
    Icon: typeof ListChecks,
  ) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={`flex items-center gap-2 rounded-xl px-2.5 py-[7px] text-[13.5px] font-semibold transition ${
          active
            ? "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-slate-900 dark:text-white"
            : "text-slate-600 hover:bg-black/[0.045] dark:text-neutral-300 dark:hover:bg-white/[0.06]"
        }`}
      >
        <span
          className={`grid size-[26px] place-items-center rounded-lg ${
            active ? "bg-[var(--accent)] text-white" : "bg-black/[0.05] text-slate-500 dark:bg-white/10 dark:text-neutral-300"
          }`}
        >
          <Icon size={14} />
        </span>
        {label}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pb-1 pt-4">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--accent),#ec4899)] text-white shadow-lg">
            <PenSquare size={16} />
          </span>
          <span className="text-[15px] font-extrabold tracking-tight">Notiva</span>
        </Link>
        <CloseButton onClose={onClose} />
      </div>

      <div className="px-3 pt-3">
        <label className="flex items-center gap-2 rounded-xl bg-black/[0.045] px-3 py-2 text-[13px] text-slate-500 focus-within:ring-2 focus-within:ring-[var(--accent)]/40 dark:bg-white/[0.07] dark:text-neutral-400">
          <Search size={14} className="shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages"
            className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:text-neutral-200"
          />
        </label>
      </div>

      <nav className="mt-3 space-y-0.5 px-3">
        {navItem("/app", "Dashboard", LayoutDashboard)}
        {navItem("/app/stats", "Statistics", BarChart3)}
        {navItem("/app/tasks", "All Tasks", ListChecks)}
        {navItem("/app/customize", "Customize", Palette)}
      </nav>

      <div className="mt-5 flex-1 overflow-y-auto px-3 pb-3">
        {favorites.length > 0 && (
          <>
            <p className="px-2.5 pb-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-neutral-500">
              Favorites
            </p>
            <div className="space-y-0.5">
              {favorites.map((page) => (
                <PageRow
                  key={`fav-${page.id}`}
                  page={page}
                  active={pathname === `/app/p/${page.id}`}
                  confirmDelete={confirmId === page.id}
                  onAskDelete={() => setConfirmId(page.id)}
                  onCancelDelete={() => setConfirmId(null)}
                  onDelete={() => handleDelete(page.id)}
                  onToggleFavorite={() => handleFavorite(page)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </>
        )}

        <div className="mt-4 flex items-center justify-between px-2.5 pb-1.5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-neutral-500">
            Pages
          </p>
          <span className="text-[10.5px] font-bold text-slate-300 dark:text-neutral-600">{list.length}</span>
        </div>

        <div className="space-y-0.5">
          {filtered.map((page) => (
            <PageRow
              key={page.id}
              page={page}
              active={pathname === `/app/p/${page.id}`}
              confirmDelete={confirmId === page.id}
              onAskDelete={() => setConfirmId(page.id)}
              onCancelDelete={() => setConfirmId(null)}
              onDelete={() => handleDelete(page.id)}
              onToggleFavorite={() => handleFavorite(page)}
              onNavigate={onNavigate}
            />
          ))}
          {filtered.length === 0 && (
            <p className="px-2.5 py-3 text-[12.5px] text-slate-400">No pages match.</p>
          )}
        </div>

        <button
          onClick={() => startTransition(handleCreate)}
          disabled={creating || pending}
          className="mt-2 flex w-full items-center gap-2 rounded-xl px-2.5 py-[7px] text-[13.5px] font-semibold text-slate-500 transition hover:bg-black/[0.045] hover:text-slate-800 dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
        >
          <span className="grid size-[26px] place-items-center rounded-lg border border-dashed border-slate-300 dark:border-neutral-600">
            {creating || pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          </span>
          New page
        </button>
      </div>

      <div className="border-t border-black/[0.06] px-3 py-3 dark:border-white/10">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent),#ec4899)] text-[15px] font-extrabold text-white shadow-md">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-extrabold leading-tight">
              {user.name || "You"}
            </span>
            <span className="block truncate text-[10.5px] font-medium text-slate-400 dark:text-neutral-500">
              {user.email}
            </span>
          </span>
          <button
            onClick={() => void signOutAction()}
            aria-label="Sign out"
            title="Sign out"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
          >
            <LogOut size={15} />
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 px-2 text-[10.5px] font-semibold text-slate-400 dark:text-neutral-500">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Synced to PostgreSQL
        </p>
      </div>
    </div>
  );
}
