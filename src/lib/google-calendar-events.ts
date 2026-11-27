export type GoogleEvent = { id: string; summary?: string; description?: string; status?: string; start?: { date?: string; dateTime?: string }; end?: { date?: string } };

// Google expands recurring events in the API; normalize instances for the month grid.
export function normalizeGoogleEvents(items: GoogleEvent[], formatter: Intl.DateTimeFormat, from: number, to: number) {
  return items.flatMap((event) => {
    if (event.status === "cancelled" || !event.start) return [];
    let date = event.start.date;
    let time: string | null = null;
    if (event.start.dateTime) {
      const timestamp = new Date(event.start.dateTime);
      if (!Number.isFinite(timestamp.getTime())) return [];
      const parts = Object.fromEntries(formatter.formatToParts(timestamp).map((p) => [p.type, p.value]));
      date = `${parts.year}-${parts.month}-${parts.day}`;
      time = `${parts.hour}:${parts.minute}`;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    const dates = [date];
    // Google uses an exclusive end date for all-day events.
    if (!time && event.end?.date && /^\d{4}-\d{2}-\d{2}$/.test(event.end.date)) {
      const end = Date.parse(`${event.end.date}T00:00:00Z`);
      let day = Date.parse(`${date}T00:00:00Z`) + 86400000;
      // Bound expansion, including for very long all-day events.
      day = Math.max(day, Date.parse(new Date(from - 86400000).toISOString().slice(0, 10) + "T00:00:00Z"));
      for (; day < end && day <= to + 86400000; day += 86400000) dates.push(new Date(day).toISOString().slice(0, 10));
    }
    return dates.map((day) => ({ id: `google:${event.id}:${day}`, title: event.summary || "Untitled event", notes: event.description || "", date: day, time, color: "#4285f4", remindMinutesBefore: null, source: "google" }));
  });
}
