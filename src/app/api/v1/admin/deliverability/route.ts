import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { requireAdmin } from "@/server/admin/admin.service";
import { listDeliverabilityAdmin } from "@/server/email/deliverability.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    return apiSuccess(await listDeliverabilityAdmin(200));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
