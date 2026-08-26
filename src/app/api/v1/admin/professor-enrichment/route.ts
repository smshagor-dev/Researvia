import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { requireAdmin } from "@/server/admin/admin.service";
import { getProfessorContactEnrichmentStats, scanProfessorContactEnrichment } from "@/server/enrichment/professor-contact-enrichment.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    return apiSuccess(await getProfessorContactEnrichmentStats());
  } catch (error) { return handleApiError(error, requestId); }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    await requireAdmin();
    return apiSuccess(await scanProfessorContactEnrichment("admin-backfill"), 202);
  } catch (error) { return handleApiError(error, requestId); }
}
