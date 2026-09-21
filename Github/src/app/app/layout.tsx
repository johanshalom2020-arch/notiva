import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { ensureSeed, getPages, getTheme } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  await ensureSeed(user.id);
  const [pageList, theme] = await Promise.all([getPages(user.id), getTheme(user.id)]);

  return (
    <AppShell
      pages={pageList}
      initialTheme={theme}
      user={{ name: user.displayName, email: user.email }}
    >
      {children}
    </AppShell>
  );
}
