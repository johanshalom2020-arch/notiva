import { DashboardClient } from "@/components/app/dashboard-client";
import { ensureSeed, getAllTodos, getAssessments, getCounts, getRecentPages } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppIndexPage() {
  const user = await requireUser();
  await ensureSeed(user.id);
  const [counts, recentPages, todoGroups, rows] = await Promise.all([
    getCounts(user.id),
    getRecentPages(user.id, 6),
    getAllTodos(user.id),
    getAssessments(user.id),
  ]);

  return (
    <DashboardClient
      displayName={user.displayName}
      counts={counts}
      recentPages={recentPages.map((p) => ({
        id: p.id,
        title: p.title,
        icon: p.icon,
        updatedAt: p.updatedAt.toISOString(),
      }))}
      todoGroups={todoGroups.map((g) => ({
        pageId: g.pageId,
        pageTitle: g.pageTitle,
        items: g.items,
      }))}
      assessments={rows}
    />
  );
}
