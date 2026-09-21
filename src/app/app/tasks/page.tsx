import { TasksClient } from "@/components/app/tasks-client";
import { getAllTodos } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await requireUser();
  const groups = await getAllTodos(user.id);
  return <TasksClient groups={groups} />;
}
