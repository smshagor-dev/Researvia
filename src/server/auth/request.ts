import { getServerEnv } from "@/config/env";
import { AppError } from "@/server/errors/AppError";

export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || "unknown").slice(0, 64);
}

export function getUserAgent(request: Request): string | null {
  return request.headers.get("user-agent")?.slice(0, 512) || null;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const secFetchSite = request.headers.get("sec-fetch-site");

  if (secFetchSite === "cross-site") {
    throw new AppError("CROSS_SITE_REQUEST", 403, "Cross-site requests are not allowed.");
  }

  if (!origin) return;

  const expectedOrigin = new URL(getServerEnv().APP_URL).origin;
  if (origin !== expectedOrigin) {
    throw new AppError("INVALID_ORIGIN", 403, "Request origin is not allowed.");
  }
}
