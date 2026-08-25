import { NextRequest } from "next/server";
import { apiFailure, apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { getSessionCookieName, getUserBySessionToken } from "@/server/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const user = await getUserBySessionToken(request.cookies.get(getSessionCookieName())?.value);
    if (!user) {
      return apiFailure("UNAUTHENTICATED", "Authentication is required.", 401, requestId);
    }
    return apiSuccess({ user });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
