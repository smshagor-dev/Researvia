import { readJson } from "@/lib/api-request";
import { apiSuccess,getRequestId,handleApiError } from "@/lib/api-response";
import { applicationPacketSchema } from "@/schemas/application-packet";
import { getApplicationReadiness,updateApplicationPacket } from "@/server/applications/application-packet.service";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
export const runtime="nodejs"; type Context={params:Promise<{id:string}>};
async function user(){const value=await getCurrentUser();if(!value)throw new AppError("UNAUTHORIZED",401,"Authentication required.");return value;}
export async function GET(request:Request,context:Context){const rid=getRequestId(request);try{const u=await user();const {id}=await context.params;return apiSuccess(await getApplicationReadiness(u.id,id));}catch(error){return handleApiError(error,rid)}}
export async function PATCH(request:Request,context:Context){const rid=getRequestId(request);try{assertSameOrigin(request);const u=await user();const {id}=await context.params;return apiSuccess(await updateApplicationPacket(u.id,id,await readJson(request,applicationPacketSchema)));}catch(error){return handleApiError(error,rid)}}
