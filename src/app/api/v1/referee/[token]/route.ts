import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { AppError } from "@/server/errors/AppError";
import { getRefereePortal, respondToRefereeRequest, submitRefereeLetter } from "@/server/productivity/referee-portal.service";

export const runtime = "nodejs";
type Context = { params: Promise<{ token: string }> };

export async function GET(request: Request, context: Context) {
  const requestId = getRequestId(request);
  try { const { token } = await context.params; return apiSuccess(await getRefereePortal(token)); }
  catch (error) { return handleApiError(error, requestId); }
}

export async function POST(request: Request, context: Context) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const { token } = await context.params;
    const form = await request.formData();
    const action = String(form.get("action") ?? "").toUpperCase();
    if (action === "CONFIRM" || action === "DECLINE") return apiSuccess(await respondToRefereeRequest(token, action));
    if (action !== "SUBMIT") throw new AppError("INVALID_REFEREE_ACTION", 400, "Choose a valid referee action.");
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("FILE_REQUIRED", 400, "Choose a recommendation letter to upload.");
    const message = String(form.get("message") ?? "");
    return apiSuccess(await submitRefereeLetter(token, file, message), 201);
  } catch (error) { return handleApiError(error, requestId); }
}
