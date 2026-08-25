import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { listStudentDocuments, uploadStudentDocument } from "@/server/documents/document.service";
import { AppError } from "@/server/errors/AppError";

export const runtime = "nodejs";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
  return user;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try { const user = await requireUser(); return apiSuccess(await listStudentDocuments(user.id)); } catch (error) { return handleApiError(error, requestId); }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "OTHER").toUpperCase();
    if (!(file instanceof File)) throw new AppError("FILE_REQUIRED", 400, "Choose a document to upload.");
    return apiSuccess(await uploadStudentDocument(user.id, file, kind), 201);
  } catch (error) { return handleApiError(error, requestId); }
}
