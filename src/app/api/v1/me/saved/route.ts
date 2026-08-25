import { NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { createSavedItemSchema, savedItemQuerySchema } from "@/schemas/saved";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { listSavedItems, saveItem } from "@/server/saved/saved.service";
import { enforceRateLimit } from "@/server/security/rate-limit";
export const runtime = "nodejs";
async function student(){const user=await getCurrentUser();if(!user)throw new AppError("UNAUTHENTICATED",401,"Sign in to continue.");if(user.role!=="STUDENT")throw new AppError("FORBIDDEN",403,"Student access is required.");return user;}
export async function GET(request:NextRequest){const requestId=getRequestId(request);try{const user=await student();const input=savedItemQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));return apiSuccess(await listSavedItems(user.id,input));}catch(error){return handleApiError(error,requestId)}}
export async function POST(request:NextRequest){const requestId=getRequestId(request);try{assertSameOrigin(request);const user=await student();await enforceRateLimit("saved:create",user.id,240,60*60*1000);const input=await readJson(request,createSavedItemSchema);return apiSuccess({item:await saveItem(user.id,input)},201);}catch(error){return handleApiError(error,requestId)}}
