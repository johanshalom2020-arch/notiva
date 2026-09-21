import { CustomizeClient } from "@/components/app/customize-client";
import { getTheme } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CustomizePage() {
  const user = await requireUser();
  const theme = await getTheme(user.id);
  return (
    <CustomizeClient
      initialTheme={theme}
      user={{ name: user.displayName, email: user.email }}
    />
  );
}
