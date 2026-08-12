import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin";
import AdminAccess from "./admin-access";

export const dynamic = "force-dynamic";

export default async function AdminAccessPage() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/signin");
  return <AdminAccess forcePasswordChange={identity.forcePasswordChange} mfaEnrolled={identity.mfaEnrolled} email={identity.user.email ?? "n2 admin"}/>;
}
