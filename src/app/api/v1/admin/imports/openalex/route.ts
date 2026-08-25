import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { requireAdmin } from "@/server/admin/admin.service";
import { createOpenAlexPreview } from "@/server/imports/provider.service";

export const runtime = "nodejs";
const schema = z.object({ entityType: z.enum(["UNIVERSITY", "PROFESSOR"]), query: z.string().trim().min(2).max(180), limit: z.number().int().min(1).max(100).default(25) });

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const input = await readJson(request, schema);
    return apiSuccess(await createOpenAlexPreview(admin.id, input.entityType, input.query, input.limit), 201);
  } catch (error) { return handleApiError(error, requestId); }
}
