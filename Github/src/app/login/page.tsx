import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Log in — Notiva",
};

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/app");

  const signupsDisabled = process.env.DISABLE_SIGNUPS === "1";
  return <LoginForm signupsDisabled={signupsDisabled} />;
}
