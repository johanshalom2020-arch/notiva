import { requireUser } from "@/lib/session";
import { FocusClient } from "@/components/app/focus-client";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  await requireUser();
  return <FocusClient />;
}
