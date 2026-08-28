import { NextRequest } from "next/server";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { cancelScheduledSystemMail } from "@/server/email/scheduled-mail.service";
import { AppError } from "@/server/errors/AppError";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
    const { id } = await params;
    const message = await cancelScheduledSystemMail(user.id, id);
    return apiSuccess({ message });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
