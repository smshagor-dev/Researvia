import { type NextRequest } from "next/server";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { requireAdmin, writeAudit } from "@/server/admin/admin.service";
import { assertSameOrigin } from "@/server/auth/request";
import { syncFeedSource } from "@/server/feeds/feed.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    await enforceRateLimit("admin:feeds:sync", admin.id, 60, 60 * 60 * 1000);
    const { id } = await context.params;
    const result = await syncFeedSource(id);
    await writeAudit({ actorUserId: admin.id, action: "ACADEMIC_FEED_SYNCED", targetType: "AcademicFeedSource", targetId: id, metadata: result });
    return apiSuccess(result);
  } catch (error) { return handleApiError(error, requestId); }
}
