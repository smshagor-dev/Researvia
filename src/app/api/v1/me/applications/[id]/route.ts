import { type NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { updateApplicationSchema } from "@/schemas/applications";
import { deleteApplication, getApplication, updateApplication } from "@/server/applications/application.service";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
  return user;
}

export async function GET(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return apiSuccess(await getApplication(user.id, id));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const input = await readJson(request, updateApplicationSchema);
    return apiSuccess({ application: await updateApplication(user.id, id, input) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    await deleteApplication(user.id, id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
