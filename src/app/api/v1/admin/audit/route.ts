import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { listAuditLogs, requireAdmin } from "@/server/admin/admin.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try { await requireAdmin(); return apiSuccess(await listAuditLogs()); } catch (error) { return handleApiError(error, requestId); }
}
