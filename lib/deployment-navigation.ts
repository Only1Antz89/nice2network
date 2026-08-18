export const DEPLOYMENT_NAVIGATION_EVENT = "n2:deployment-navigation";

export function signalDeploymentNavigation() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DEPLOYMENT_NAVIGATION_EVENT));
}
