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

async function updateContentStatus(type: string, id: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  if (type === "university") return University.updateOne({ _id: id }, { $set: { status } });
  if (type === "professor") return Professor.updateOne({ _id: id }, { $set: { status } });
  if (type === "scholarship") return Scholarship.updateOne({ _id: id }, { $set: { status } });
  if (type === "opportunity") return Opportunity.updateOne({ _id: id }, { $set: { status } });
  throw new AppError("CONTENT_TYPE_NOT_FOUND", 404, "Unsupported content type.");
}

export async function PATCH(request: Request, context: { params: Promise<{ type: string; id: string }> }) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { type, id } = await context.params;
    const input = await readJson(request, schema);
    const result = await updateContentStatus(type, id, input.status);
    if (result.matchedCount !== 1) throw new AppError("CONTENT_NOT_FOUND", 404, "Content record not found.");
    await writeAudit({ actorUserId: admin.id, action: "ADMIN_CONTENT_STATUS_CHANGED", targetType: type, targetId: id, metadata: { status: input.status } });
    return apiSuccess({ status: input.status });
  } catch (error) { return handleApiError(error, requestId); }
}
