import { type NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { createApplicationTaskSchema } from "@/schemas/applications";
import { createApplicationTask } from "@/server/applications/application.service";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
    const { id } = await context.params;
    const input = await readJson(request, createApplicationTaskSchema);
    return apiSuccess({ task: await createApplicationTask(user.id, id, input) }, 201);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
