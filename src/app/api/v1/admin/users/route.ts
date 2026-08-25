import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { listAdminUsers, requireAdmin } from "@/server/admin/admin.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    const query = new URL(request.url).searchParams.get("q") ?? "";
    return apiSuccess(await listAdminUsers(query));
  } catch (error) { return handleApiError(error, requestId); }
}
