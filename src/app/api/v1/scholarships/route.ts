import { NextRequest } from "next/server";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { scholarshipSearchSchema } from "@/schemas/opportunities";
import { getClientIp } from "@/server/auth/request";
import { searchScholarships } from "@/server/opportunities/opportunity.service";
import { enforceRateLimit } from "@/server/security/rate-limit";
export const runtime = "nodejs";
export async function GET(request: NextRequest) { const requestId = getRequestId(request); try { const input = scholarshipSearchSchema.parse(Object.fromEntries(request.nextUrl.searchParams)); await enforceRateLimit("discovery:scholarships", getClientIp(request), 240, 60 * 60 * 1000); return apiSuccess(await searchScholarships(input)); } catch (error) { return handleApiError(error, requestId); } }
