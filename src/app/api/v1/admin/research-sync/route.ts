import { type NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { providerSyncSchema } from "@/schemas/feeds";
import { requireAdmin, writeAudit } from "@/server/admin/admin.service";
import { assertSameOrigin } from "@/server/auth/request";
import { syncCrossrefPapers, syncOpenAlexPapers } from "@/server/research/provider.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    await enforceRateLimit("admin:research-sync", admin.id, 40, 60 * 60 * 1000);
    const input = await readJson(request, providerSyncSchema);
    const result = input.provider === "OPENALEX" ? await syncOpenAlexPapers(input.query, input.limit) : await syncCrossrefPapers(input.query, input.limit);
    await writeAudit({ actorUserId: admin.id, action: "RESEARCH_PROVIDER_SYNCED", targetType: "Paper", metadata: { ...result, query: input.query } });
    return apiSuccess(result);
  } catch (error) { return handleApiError(error, requestId); }
}
