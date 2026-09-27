import { Suspense } from "react";
import { CalendarClient } from "@/components/app/calendar-client";
import { getEvents } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await requireUser();
  const events = await getEvents(user.id);
  return (
    <Suspense>
      <CalendarClient initialEvents={events} />
    </Suspense>
  );
}
