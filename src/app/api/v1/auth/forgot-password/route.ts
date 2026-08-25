import { NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { forgotPasswordSchema } from "@/schemas/auth";
import { requestPasswordReset } from "@/server/auth/auth.service";
import { assertSameOrigin, getClientIp } from "@/server/auth/request";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const input = await readJson(request, forgotPasswordSchema);
    await enforceRateLimit("auth:forgot", `${getClientIp(request)}:${input.email}`, 5, 60 * 60 * 1000);
    await requestPasswordReset(input.email);
    return apiSuccess({
      message: "If an eligible account exists for that email, a password reset link has been sent."
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
