import { NextRequest } from "next/server";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { publicSlugSchema } from "@/schemas/discovery";
import { getClientIp } from "@/server/auth/request";
import { getLabBySlug } from "@/server/discovery/discovery.service";
import { enforceRateLimit } from "@/server/security/rate-limit";
export const runtime="nodejs";
export async function GET(request:NextRequest,context:{params:Promise<{slug:string}>}){const requestId=getRequestId(request);try{const {slug}=await context.params;const safeSlug=publicSlugSchema.parse(slug);await enforceRateLimit("discovery:lab",getClientIp(request),360,60*60*1000);return apiSuccess({lab:await getLabBySlug(safeSlug)});}catch(error){return handleApiError(error,requestId);}}
