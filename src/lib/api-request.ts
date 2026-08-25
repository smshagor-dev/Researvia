import type { ZodType } from "zod";
import { AppError } from "@/server/errors/AppError";

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("INVALID_JSON", 400, "Request body must be valid JSON.");
  }
  return schema.parse(body);
}
