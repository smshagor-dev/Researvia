import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { requireAdmin, writeAudit } from "@/server/admin/admin.service";
import { AppError } from "@/server/errors/AppError";
import { Opportunity } from "@/server/models/Opportunity";
import { Professor } from "@/server/models/Professor";
import { Scholarship } from "@/server/models/Scholarship";
import { University } from "@/server/models/University";

export const runtime = "nodejs";
const schema = z.object({ status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]) });

export async function PATCH(request: Request, context: { params: Promise<{ type: string; id: string }> }) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { type, id } = await context.params;
    const input = await readJson(request, schema);
    const models = { university: University, professor: Professor, scholarship: Scholarship, opportunity: Opportunity } as const;
    const model = models[type as keyof typeof models];
    if (!model) throw new AppError("CONTENT_TYPE_NOT_FOUND", 404, "Unsupported content type.");
    const result = await model.updateOne({ _id: id } as never, { $set: { status: input.status } } as never);
    if (result.matchedCount !== 1) throw new AppError("CONTENT_NOT_FOUND", 404, "Content record not found.");
    await writeAudit({ actorUserId: admin.id, action: "ADMIN_CONTENT_STATUS_CHANGED", targetType: type, targetId: id, metadata: { status: input.status } });
    return apiSuccess({ status: input.status });
  } catch (error) { return handleApiError(error, requestId); }
}
