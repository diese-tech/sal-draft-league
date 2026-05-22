export function safeRedirectPath(next: string | null | undefined, fallback = "/register") {
  return next?.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
