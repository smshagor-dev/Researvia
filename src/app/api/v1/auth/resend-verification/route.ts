import { NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { resendVerificationSchema } from "@/schemas/auth";
import { resendVerificationEmail } from "@/server/auth/auth.service";
import { assertSameOrigin, getClientIp } from "@/server/auth/request";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const input = await readJson(request, resendVerificationSchema);
    await enforceRateLimit("auth:resend", `${getClientIp(request)}:${input.email}`, 5, 60 * 60 * 1000);
    await resendVerificationEmail(input.email);
    return apiSuccess({
      message: "If that account needs verification, a new verification email has been sent."
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
