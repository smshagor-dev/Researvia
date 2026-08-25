import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { requireAdmin, writeAudit } from "@/server/admin/admin.service";
import { assertSameOrigin } from "@/server/auth/request";
import { cancelJob, retryJob } from "@/server/jobs/job.service";

export const runtime = "nodejs";
const schema = z.object({ action: z.enum(["RETRY", "CANCEL"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await context.params;
    const { action } = await readJson(request, schema);
    const job = action === "RETRY" ? await retryJob(id) : await cancelJob(id);
    await writeAudit({
      actorUserId: admin.id,
      action: action === "RETRY" ? "ADMIN_JOB_RETRIED" : "ADMIN_JOB_CANCELLED",
      targetType: "Job",
      targetId: id
    });
    return apiSuccess(job);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
