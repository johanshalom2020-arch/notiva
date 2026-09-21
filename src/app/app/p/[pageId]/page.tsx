import { redirect } from "next/navigation";
import { PageEditor } from "@/components/editor/page-editor";
import { getBlocks, getPage } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const user = await requireUser();
  const { pageId } = await params;
  const page = await getPage(pageId, user.id);
  if (!page) redirect("/app");

  const blockList = await getBlocks(pageId);
  return <PageEditor key={pageId} page={page} initialBlocks={blockList} />;
}
