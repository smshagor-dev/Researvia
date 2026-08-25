import { NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { resetPasswordSchema } from "@/schemas/auth";
import { resetPassword } from "@/server/auth/auth.service";
import { assertSameOrigin, getClientIp } from "@/server/auth/request";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const input = await readJson(request, resetPasswordSchema);
    await enforceRateLimit("auth:reset", getClientIp(request), 10, 60 * 60 * 1000);
    await resetPassword(input);
    return apiSuccess({
      message: "Password updated. All existing sessions have been signed out."
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
