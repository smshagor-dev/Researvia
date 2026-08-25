import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { requireAdmin } from "@/server/admin/admin.service";
import { listJobs } from "@/server/jobs/job.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    return apiSuccess(await listJobs(200));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
