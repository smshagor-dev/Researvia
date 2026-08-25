import { type NextRequest } from "next/server";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { requireAdmin, writeAudit } from "@/server/admin/admin.service";
import { assertSameOrigin } from "@/server/auth/request";
import { deleteFeedSource } from "@/server/feeds/feed.service";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await context.params;
    await deleteFeedSource(id);
    await writeAudit({ actorUserId: admin.id, action: "ACADEMIC_FEED_DELETED", targetType: "AcademicFeedSource", targetId: id });
    return apiSuccess({ deleted: true });
  } catch (error) { return handleApiError(error, requestId); }
}
