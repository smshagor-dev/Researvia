import { NextRequest } from "next/server";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { clearSessionCookie, getSessionCookieName, revokeSession } from "@/server/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    await revokeSession(request.cookies.get(getSessionCookieName())?.value);
    const response = apiSuccess({ message: "Signed out successfully." });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
