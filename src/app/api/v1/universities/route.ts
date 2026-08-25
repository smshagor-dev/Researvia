import { NextRequest } from "next/server";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { universitySearchSchema } from "@/schemas/discovery";
import { getClientIp } from "@/server/auth/request";
import { searchUniversities } from "@/server/discovery/discovery.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const input = universitySearchSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    await enforceRateLimit("discovery:universities", getClientIp(request), 240, 60 * 60 * 1000);
    return apiSuccess(await searchUniversities(input));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
