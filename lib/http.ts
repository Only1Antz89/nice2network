export function isSecureRequest(request: Request) {
  if (new URL(request.url).protocol === "https:") return true;

  return request.headers
    .get("x-forwarded-proto")
    ?.split(",", 1)[0]
    ?.trim()
    .toLowerCase() === "https";
}
