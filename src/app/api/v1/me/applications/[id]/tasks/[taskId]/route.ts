import { type NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { updateApplicationTaskSchema } from "@/schemas/applications";
import { deleteApplicationTask, updateApplicationTask } from "@/server/applications/application.service";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; taskId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
    const { id, taskId } = await context.params;
    const input = await readJson(request, updateApplicationTaskSchema);
    return apiSuccess({ task: await updateApplicationTask(user.id, id, taskId, input) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
    const { id, taskId } = await context.params;
    await deleteApplicationTask(user.id, id, taskId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
