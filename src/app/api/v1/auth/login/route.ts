import { NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { loginSchema } from "@/schemas/auth";
import { loginStudent } from "@/server/auth/auth.service";
import { assertSameOrigin, getClientIp, getUserAgent } from "@/server/auth/request";
import { attachSessionCookie } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const input = await readJson(request, loginSchema);
    const ip = getClientIp(request);
    await enforceRateLimit("auth:login", `${ip}:${input.email}`, 10, 15 * 60 * 1000);
    const session = await loginStudent(input, {
      ipAddress: ip === "unknown" ? null : ip,
      userAgent: getUserAgent(request)
    });
    const response = apiSuccess({ message: "Signed in successfully." });
    attachSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
