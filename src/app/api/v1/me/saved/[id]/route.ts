import { NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { objectIdSchema, updateSavedItemSchema } from "@/schemas/saved";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { deleteSavedItem, updateSavedItem } from "@/server/saved/saved.service";
export const runtime="nodejs";
async function student(){const user=await getCurrentUser();if(!user)throw new AppError("UNAUTHENTICATED",401,"Sign in to continue.");if(user.role!=="STUDENT")throw new AppError("FORBIDDEN",403,"Student access is required.");return user;}
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){const requestId=getRequestId(request);try{assertSameOrigin(request);const user=await student();const{id}=await context.params;const safeId=objectIdSchema.parse(id);const input=await readJson(request,updateSavedItemSchema);return apiSuccess({item:await updateSavedItem(user.id,safeId,input)});}catch(error){return handleApiError(error,requestId)}}
export async function DELETE(request:NextRequest,context:{params:Promise<{id:string}>}){const requestId=getRequestId(request);try{assertSameOrigin(request);const user=await student();const{id}=await context.params;const safeId=objectIdSchema.parse(id);await deleteSavedItem(user.id,safeId);return apiSuccess({message:"Saved item removed."});}catch(error){return handleApiError(error,requestId)}}
