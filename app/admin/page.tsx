import { redirect } from "next/navigation";
import { getAdminIdentity, permissionsForRole } from "@/lib/admin";
import AdminConsole from "./admin-console";

export const dynamic = "force-dynamic";

export default async function AdminPage(){
  const identity=await getAdminIdentity();
  if(!identity)redirect("/signin?next=/admin");
  if(identity.forcePasswordChange||!identity.mfaEnrolled||!identity.recentlyVerified)redirect("/admin/access");
  return <AdminConsole name={identity.user.name??"n2 administrator"} role={identity.role} permissions={permissionsForRole(identity.role)}/>;
}
