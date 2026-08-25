import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { requireAdmin } from "@/server/admin/admin.service";
import { confirmImport } from "@/server/imports/import.service";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await context.params;
    return apiSuccess(await confirmImport(admin.id, id));
  } catch (error) { return handleApiError(error, requestId); }
}
