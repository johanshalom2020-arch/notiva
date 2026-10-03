import { getSubjects, getTimetable, getTimetableExceptions } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { TimetableClient } from "@/components/app/timetable-client";

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  const user = await requireUser();
  const [entries, exceptions, subjects] = await Promise.all([
    getTimetable(user.id),
    getTimetableExceptions(user.id),
    getSubjects(user.id),
  ]);

  return (
    <TimetableClient
      initialEntries={entries}
      initialExceptions={exceptions}
      subjects={subjects.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
    />
  );
}
