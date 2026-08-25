import { type NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { createApplicationNoteSchema } from "@/schemas/applications";
import { addApplicationNote } from "@/server/applications/application.service";
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
    const input = await readJson(request, createApplicationNoteSchema);
    return apiSuccess({ timeline: await addApplicationNote(user.id, id, input.message) }, 201);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
