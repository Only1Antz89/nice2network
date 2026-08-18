import { auth } from "@/auth";
import { redirect } from "next/navigation";
import FollowRequestResponse from "./response";

export default async function FollowRequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/signin?next=${encodeURIComponent(`/follow-request/${requestId}`)}`);
  return <FollowRequestResponse requestId={requestId} />;
}
