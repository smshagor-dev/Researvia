import { apiSuccess } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return apiSuccess({
    status: "ok",
    service: "researvia",
    timestamp: new Date().toISOString()
  });
}
