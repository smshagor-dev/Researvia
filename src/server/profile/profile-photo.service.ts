import mongoose from "mongoose";
import { connectDatabase } from "@/server/db/mongoose";
import { AppError } from "@/server/errors/AppError";
import { StudentProfile } from "@/server/models/StudentProfile";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeName(value: string) {
  return value.replace(/[\\/\0\r\n]+/g, "_").slice(0, 255) || "profile-photo";
}

async function photoBucket() {
  const connection = await connectDatabase();
  const db = connection.connection.db;
  if (!db) throw new AppError("DATABASE_UNAVAILABLE", 503, "Profile photo storage is unavailable.");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: "studentProfilePhotos" });
}

export async function uploadStudentProfilePhoto(userId: string, file: File) {
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    throw new AppError("UNSUPPORTED_PHOTO_TYPE", 400, "Profile photo must be JPEG, PNG, or WebP.");
  }
  if (file.size < 1 || file.size > MAX_PHOTO_BYTES) {
    throw new AppError("PHOTO_SIZE_INVALID", 400, "Profile photo must be 5 MB or smaller.");
  }

  const storage = await photoBucket();
  const name = safeName(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = storage.openUploadStream(name, { metadata: { userId, mimeType: file.type } });
  await new Promise<void>((resolve, reject) => {
    upload.end(buffer, (error?: Error | null) => (error ? reject(error) : resolve()));
  });

  try {
    const previous = await StudentProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          photoFileId: upload.id,
          photoMimeType: file.type,
          photoOriginalName: name,
          photoUpdatedAt: new Date()
        },
        $setOnInsert: { userId }
      },
      { upsert: true, new: false, setDefaultsOnInsert: true }
    ).lean();
    if (previous?.photoFileId) {
      await storage.delete(previous.photoFileId).catch(() => undefined);
    }
  } catch (error) {
    await storage.delete(upload.id).catch(() => undefined);
    throw error;
  }
}

export async function readStudentProfilePhoto(userId: string) {
  await connectDatabase();
  const profile = await StudentProfile.findOne({ userId }).select({ photoFileId: 1, photoMimeType: 1, photoOriginalName: 1 }).lean();
  if (!profile?.photoFileId) throw new AppError("PROFILE_PHOTO_NOT_FOUND", 404, "Profile photo not found.");
  const storage = await photoBucket();
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = storage.openDownloadStream(profile.photoFileId);
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  return {
    buffer: Buffer.concat(chunks),
    mimeType: profile.photoMimeType || "application/octet-stream",
    name: profile.photoOriginalName || "profile-photo"
  };
}

export async function deleteStudentProfilePhoto(userId: string) {
  await connectDatabase();
  const previous = await StudentProfile.findOneAndUpdate(
    { userId },
    { $set: { photoFileId: null, photoMimeType: "", photoOriginalName: "", photoUpdatedAt: null } },
    { new: false }
  ).lean();
  if (!previous?.photoFileId) return;
  const storage = await photoBucket();
  await storage.delete(previous.photoFileId).catch(() => undefined);
}
