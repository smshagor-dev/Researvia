import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { requireSuperAdmin, updateUserBySuperAdmin } from "@/server/admin/admin.service";

export const runtime = "nodejs";
const schema = z.object({ role: z.enum(["STUDENT", "ADMIN", "SUPER_ADMIN"]).optional(), status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]).optional() }).refine((value) => Boolean(value.role || value.status), "No change supplied.");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const actor = await requireSuperAdmin();
    const { id } = await context.params;
    const input = await readJson(request, schema);
    return apiSuccess(await updateUserBySuperAdmin(actor.id, id, input));
  } catch (error) { return handleApiError(error, requestId); }
}
