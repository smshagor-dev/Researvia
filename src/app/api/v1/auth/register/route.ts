import { NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { registerSchema } from "@/schemas/auth";
import { assertSameOrigin, getClientIp } from "@/server/auth/request";
import { registerStudent } from "@/server/auth/auth.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const input = await readJson(request, registerSchema);
    const ip = getClientIp(request);
    await enforceRateLimit("auth:register", `${ip}:${input.email}`, 5, 60 * 60 * 1000);
    const result = await registerStudent(input);
    return apiSuccess(
      {
        email: result.email,
        message: "Account created. Check your email to verify your account."
      },
      201
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
