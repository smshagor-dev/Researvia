import { type NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { createFeedSourceSchema } from "@/schemas/feeds";
import { requireAdmin, writeAudit } from "@/server/admin/admin.service";
import { assertSameOrigin } from "@/server/auth/request";
import { createFeedSource, listFeedSources } from "@/server/feeds/feed.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    return apiSuccess({ sources: await listFeedSources() });
  } catch (error) { return handleApiError(error, requestId); }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    await enforceRateLimit("admin:feeds:create", admin.id, 30, 60 * 60 * 1000);
    const input = await readJson(request, createFeedSourceSchema);
    const source = await createFeedSource(admin.id, input);
    await writeAudit({ actorUserId: admin.id, action: "ACADEMIC_FEED_CREATED", targetType: "AcademicFeedSource", targetId: source._id.toString(), metadata: { entityType: source.entityType, url: source.url } });
    return apiSuccess({ source }, 201);
  } catch (error) { return handleApiError(error, requestId); }
}
