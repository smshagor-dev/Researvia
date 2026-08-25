import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin, getClientIp } from "@/server/auth/request";
import { attachSessionCookie } from "@/server/auth/session";
import { completeTwoFactorLogin } from "@/server/auth/two-factor.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";
const schema = z.object({ challengeToken: z.string().min(32), code: z.string().trim().min(6).max(32) });

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const input = await readJson(request, schema);
    await enforceRateLimit("auth:2fa", getClientIp(request), 10, 10 * 60 * 1000);
    const session = await completeTwoFactorLogin(input.challengeToken, input.code);
    const response = apiSuccess({ message: "Signed in successfully." });
    attachSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
