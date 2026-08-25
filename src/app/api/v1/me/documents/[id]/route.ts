import { getRequestId, handleApiError, apiSuccess } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { deleteStudentDocument, readStudentDocument } from "@/server/documents/document.service";
import { AppError } from "@/server/errors/AppError";

export const runtime = "nodejs";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
  return user;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const { document, buffer } = await readStudentDocument(user.id, id);
    return new Response(buffer, {
      headers: {
        "content-type": document.mimeType,
        "content-length": String(buffer.length),
        "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.originalName)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) { return handleApiError(error, requestId); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    await deleteStudentDocument(user.id, id);
    return apiSuccess({ message: "Document deleted." });
  } catch (error) { return handleApiError(error, requestId); }
}
