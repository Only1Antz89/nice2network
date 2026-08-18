import { auth } from "@/auth";
import { redirect } from "next/navigation";
import InvitationResponse from "./response";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/signin?next=${encodeURIComponent(`/invite/${token}`)}`);
  return <InvitationResponse token={token}/>;
}
