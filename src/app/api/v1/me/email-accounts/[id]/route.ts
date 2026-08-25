import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { disconnectEmailAccount, syncEmailMetadata } from "@/server/email/email-account.service";
import { AppError } from "@/server/errors/AppError";

export const runtime = "nodejs";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
  return user;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    return apiSuccess(await syncEmailMetadata(user.id, id));
  } catch (error) { return handleApiError(error, requestId); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    await disconnectEmailAccount(user.id, id);
    return apiSuccess({ message: "Email account disconnected." });
  } catch (error) { return handleApiError(error, requestId); }
}
