import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ChangeTemporaryPassword from "./change-temporary-password";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?next=/change-password");
  if (!session.user.forcePasswordChange) redirect("/");
  return <ChangeTemporaryPassword/>;
}
