import { Suspense } from "react";
import { StatsClient } from "@/components/app/stats-client";
import { ensureSeed, getAssessments, getSubjects } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const user = await requireUser();
  await ensureSeed(user.id);
  const [subjects, rows] = await Promise.all([getSubjects(user.id), getAssessments(user.id)]);
  return (
    <Suspense>
      <StatsClient initialSubjects={subjects} initialAssessments={rows} />
    </Suspense>
  );
}
