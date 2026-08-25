import mongoose from "mongoose";
import { apiFailure, apiSuccess, getRequestId } from "@/lib/api-response";
import { connectDatabase } from "@/server/db/mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    await connectDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection is not ready");
    await db.admin().ping();

    return apiSuccess({ status: "ready", database: "connected" });
  } catch {
    return apiFailure("INTERNAL_ERROR", "Service is not ready", 503, requestId);
  }
}
