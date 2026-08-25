import { z } from "zod";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { requireAdmin } from "@/server/admin/admin.service";
import { AppError } from "@/server/errors/AppError";
import { createImportPreview, parseCsv, type ImportEntityType } from "@/server/imports/import.service";

export const runtime = "nodejs";
const entitySchema = z.enum(["UNIVERSITY", "PROFESSOR", "SCHOLARSHIP", "OPPORTUNITY"]);

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const entityType = entitySchema.parse(String(form.get("entityType") ?? "")) as ImportEntityType;
      const file = form.get("file");
      if (!(file instanceof File)) throw new AppError("IMPORT_FILE_REQUIRED", 400, "Choose a CSV or JSON file.");
      if (file.size > 2 * 1024 * 1024) throw new AppError("IMPORT_FILE_TOO_LARGE", 400, "Import files must be 2 MB or smaller.");
      const source = await file.text();
      const isJson = file.type === "application/json" || file.name.toLowerCase().endsWith(".json");
      let rows: unknown[];
      if (isJson) {
        const parsed = JSON.parse(source) as unknown;
        if (!Array.isArray(parsed)) throw new AppError("IMPORT_JSON_ARRAY_REQUIRED", 400, "JSON imports must contain an array of records.");
        rows = parsed;
      } else rows = parseCsv(source);
      return apiSuccess(await createImportPreview(admin.id, entityType, isJson ? "JSON" : "CSV", rows), 201);
    }

    const body = await request.json() as { entityType?: string; records?: unknown[] };
    const entityType = entitySchema.parse(body.entityType) as ImportEntityType;
    if (!Array.isArray(body.records)) throw new AppError("IMPORT_RECORDS_REQUIRED", 400, "Provide an array of records.");
    return apiSuccess(await createImportPreview(admin.id, entityType, "JSON", body.records), 201);
  } catch (error) { return handleApiError(error, requestId); }
}
