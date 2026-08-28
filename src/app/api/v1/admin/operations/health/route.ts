import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { requireAdmin } from "@/server/admin/admin.service";
import { getOperationalHealth } from "@/server/admin/operational-health.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    return apiSuccess(await getOperationalHealth());
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
