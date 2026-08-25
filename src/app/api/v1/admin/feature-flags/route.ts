import { type NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { featureFlagSchema } from "@/schemas/admin-platform";
import { requireAdmin, writeAudit } from "@/server/admin/admin.service";
import { listFeatureFlags, upsertFeatureFlag } from "@/server/admin/platform.service";
import { assertSameOrigin } from "@/server/auth/request";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";
export async function GET(request: NextRequest) { const requestId = getRequestId(request); try { await requireAdmin(); return apiSuccess({ flags: await listFeatureFlags() }); } catch (error) { return handleApiError(error, requestId); } }
export async function POST(request: NextRequest) { const requestId = getRequestId(request); try { assertSameOrigin(request); const admin = await requireAdmin(); await enforceRateLimit("admin:feature-flags", admin.id, 120, 60 * 60 * 1000); const input = await readJson(request, featureFlagSchema); const flag = await upsertFeatureFlag(admin.id, input); await writeAudit({ actorUserId: admin.id, action: "FEATURE_FLAG_UPDATED", targetType: "FeatureFlag", targetId: flag._id.toString(), metadata: { key: flag.key, enabled: flag.enabled, rolloutPercent: flag.rolloutPercent } }); return apiSuccess({ flag }); } catch (error) { return handleApiError(error, requestId); } }
