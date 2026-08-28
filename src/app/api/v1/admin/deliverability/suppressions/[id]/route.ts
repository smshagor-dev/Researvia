import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { requireSuperAdmin, writeAudit } from "@/server/admin/admin.service";
import { setMailSuppressionActive } from "@/server/email/deliverability.service";

export const runtime = "nodejs";

const schema = z.object({ active: z.boolean() }).strict();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const admin = await requireSuperAdmin();
    const { id } = await context.params;
    const input = await readJson(request, schema);
    const result = await setMailSuppressionActive(admin.id, id, input.active);
    await writeAudit({
      actorUserId: admin.id,
      action: input.active ? "MAIL_SUPPRESSION_REACTIVATED" : "MAIL_SUPPRESSION_RESTORED",
      targetType: "MailSuppression",
      targetId: id,
      metadata: { email: result.email, active: result.active }
    });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
