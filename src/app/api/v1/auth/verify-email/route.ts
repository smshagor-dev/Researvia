import { NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { verifyEmailSchema } from "@/schemas/auth";
import { verifyEmailAddress } from "@/server/auth/auth.service";
import { assertSameOrigin, getClientIp } from "@/server/auth/request";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const input = await readJson(request, verifyEmailSchema);
    await enforceRateLimit("auth:verify", getClientIp(request), 20, 60 * 60 * 1000);
    await verifyEmailAddress(input.token);
    return apiSuccess({ message: "Your email has been verified. You can now sign in." });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
