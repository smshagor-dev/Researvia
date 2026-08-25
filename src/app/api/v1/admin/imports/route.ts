import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { requireAdmin } from "@/server/admin/admin.service";
import { listImportJobs } from "@/server/imports/import.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try { const admin = await requireAdmin(); return apiSuccess(await listImportJobs(admin.id)); } catch (error) { return handleApiError(error, requestId); }
}
