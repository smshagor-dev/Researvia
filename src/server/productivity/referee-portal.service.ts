import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { connectDatabase } from "@/server/db/mongoose";
import { AppError } from "@/server/errors/AppError";
import { enqueueJob } from "@/server/jobs/job.service";
import { Notification } from "@/server/models/Notification";
import { RecommendationRequest } from "@/server/models/RecommendationRequest";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
function safeName(value: string) { return value.replace(/[\\/\0\r\n]+/g, "_").slice(0, 255) || "recommendation-letter"; }

export function createRefereePortalAccess(deadline?: Date | null) {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const defaultExpiry = now + 30 * 24 * 60 * 60 * 1000;
  const deadlineExpiry = deadline ? new Date(deadline).getTime() + 7 * 24 * 60 * 60 * 1000 : 0;
  const expiresAt = new Date(Math.min(Math.max(defaultExpiry, deadlineExpiry), now + 120 * 24 * 60 * 60 * 1000));
  return { token, hash: tokenHash(token), expiresAt };
}

async function bucket() {
  const connection = await connectDatabase();
  const db = connection.connection.db;
  if (!db) throw new AppError("DATABASE_UNAVAILABLE", 503, "Recommendation storage is unavailable.");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: "confidentialRecommendations" });
}

async function resolveRequest(token: string) {
  if (!/^[a-f\d]{64}$/i.test(token)) throw new AppError("REFEREE_LINK_INVALID", 404, "This referee link is invalid.");
  await connectDatabase();
  const item = await RecommendationRequest.findOne({ portalTokenHash: tokenHash(token) }).select("+portalTokenHash +confidentialFileId");
  if (!item) throw new AppError("REFEREE_LINK_INVALID", 404, "This referee link is invalid.");
  if (!item.portalExpiresAt || new Date(item.portalExpiresAt).getTime() <= Date.now()) throw new AppError("REFEREE_LINK_EXPIRED", 410, "This referee link has expired. Please ask the applicant to send a new request.");
  if (item.status === "CANCELLED") throw new AppError("REFEREE_REQUEST_CANCELLED", 410, "This recommendation request has been cancelled.");
  item.portalLastAccessedAt = new Date();
  await item.save();
  return item;
}

function publicDto(item: Awaited<ReturnType<typeof resolveRequest>>) {
  return {
    refereeName: item.refereeName,
    institution: item.institution,
    refereeTitle: item.refereeTitle,
    applicationName: item.applicationName,
    deadline: item.deadline ? new Date(item.deadline).toISOString() : null,
    status: item.status,
    expiresAt: item.portalExpiresAt ? new Date(item.portalExpiresAt).toISOString() : null,
    submittedAt: item.receivedAt ? new Date(item.receivedAt).toISOString() : null
  };
}

export async function getRefereePortal(token: string) { return publicDto(await resolveRequest(token)); }

export async function respondToRefereeRequest(token: string, action: "CONFIRM" | "DECLINE") {
  const item = await resolveRequest(token);
  if (item.status === "RECEIVED") throw new AppError("RECOMMENDATION_ALREADY_RECEIVED", 409, "A recommendation has already been submitted.");
  if (action === "CONFIRM") {
    item.status = "CONFIRMED";
    item.confirmedAt = new Date();
    item.declinedAt = null;
  } else {
    item.status = "DECLINED";
    item.declinedAt = new Date();
    item.confirmedAt = null;
  }
  await item.save();
  return publicDto(item);
}

export async function submitRefereeLetter(token: string, file: File, message = "") {
  const item = await resolveRequest(token);
  if (item.status === "RECEIVED") throw new AppError("RECOMMENDATION_ALREADY_RECEIVED", 409, "A recommendation has already been submitted.");
  if (item.status === "DECLINED") throw new AppError("RECOMMENDATION_DECLINED", 409, "This recommendation request was declined.");
  if (!ALLOWED_TYPES.has(file.type)) throw new AppError("UNSUPPORTED_FILE_TYPE", 400, "Upload a PDF, DOC, or DOCX recommendation letter.");
  if (file.size < 1 || file.size > MAX_BYTES) throw new AppError("FILE_SIZE_INVALID", 400, "Recommendation letters must be 10 MB or smaller.");
  if (message.length > 8000) throw new AppError("MESSAGE_TOO_LONG", 400, "The referee message is too long.");

  const storage = await bucket();
  const name = safeName(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = storage.openUploadStream(name, { metadata: { recommendationRequestId: String(item._id), userId: String(item.userId), confidential: true, mimeType: file.type } });
  await new Promise<void>((resolve, reject) => { upload.end(buffer, (error?: Error | null) => error ? reject(error) : resolve()); });

  const previousFileId = item.confidentialFileId ? new mongoose.Types.ObjectId(String(item.confidentialFileId)) : null;
  try {
    item.confidentialFileId = upload.id;
    item.confidentialOriginalName = name;
    item.confidentialMimeType = file.type;
    item.confidentialSize = file.size;
    item.refereeMessage = message.trim();
    item.status = "RECEIVED";
    item.receivedAt = new Date();
    if (!item.confirmedAt) item.confirmedAt = new Date();
    await item.save();
  } catch (error) {
    await storage.delete(upload.id).catch(() => undefined);
    throw error;
  }
  if (previousFileId) await storage.delete(previousFileId).catch(() => undefined);

  let notificationId: string | null = null;
  try {
    const notification = await Notification.create({
      userId: item.userId,
      type: "RECOMMENDATION_RECEIVED",
      title: "Recommendation received",
      message: `${item.refereeName} submitted a confidential recommendation for ${item.applicationName}.`,
      href: "/dashboard/recommendation-letters",
      dedupeKey: `recommendation-received:${item._id}`,
      metadata: { recommendationRequestId: String(item._id) }
    });
    notificationId = String(notification._id);
  } catch (error: unknown) {
    if (!(typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000)) throw error;
  }
  if (notificationId) await enqueueJob({ type: "SEND_PUSH_NOTIFICATION", payload: { notificationId }, idempotencyKey: `push:${notificationId}` });
  return publicDto(item);
}

export async function deleteConfidentialRecommendation(fileId: unknown) {
  if (!fileId || !mongoose.isValidObjectId(String(fileId))) return;
  const storage = await bucket();
  await storage.delete(new mongoose.Types.ObjectId(String(fileId))).catch(() => undefined);
}
