export type MessageEligibilityInput = {
  permission?: string | null;
  sharedProject: boolean;
  mutual: boolean;
  senderIsAdmin: boolean;
  recipientIsAdmin: boolean;
};

export function getMessageEligibility({
  permission = "connections",
  sharedProject,
  mutual,
  senderIsAdmin,
  recipientIsAdmin,
}: MessageEligibilityInput) {
  if (permission === "nobody")
    return { canMessage: false, reason: "Not accepting new messages" };
  if (sharedProject)
    return { canMessage: true, reason: "Shared project" };
  if (mutual)
    return { canMessage: true, reason: "Mutual connection" };
  if (senderIsAdmin && recipientIsAdmin)
    return { canMessage: true, reason: "n2 admin team" };
  if (permission === "everyone")
    return { canMessage: true, reason: "Messages open" };
  return { canMessage: false, reason: "Connect with each other first" };
}
