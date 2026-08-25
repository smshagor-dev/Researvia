import mongoose from "mongoose";
import { connectDatabase } from "@/server/db/mongoose";
import { AppError } from "@/server/errors/AppError";
import { StudentDocument } from "@/server/models/StudentDocument";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
]);
const KINDS = new Set(["CV", "TRANSCRIPT", "SOP", "PROPOSAL", "OTHER"]);

function safeName(value: string) {
  return value.replace(/[\\/\0\r\n]+/g, "_").slice(0, 255) || "document";
}

async function bucket() {
  const connection = await connectDatabase();
  const db = connection.connection.db;
  if (!db) throw new AppError("DATABASE_UNAVAILABLE", 503, "Document storage is unavailable.");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: "studentDocuments" });
}

export async function uploadStudentDocument(userId: string, file: File, kind: string) {
  if (!KINDS.has(kind)) throw new AppError("INVALID_DOCUMENT_KIND", 400, "Unsupported document type.");
  if (!ALLOWED_TYPES.has(file.type)) throw new AppError("UNSUPPORTED_FILE_TYPE", 400, "Only PDF, DOC, DOCX, and text documents are allowed.");
  if (file.size < 1 || file.size > MAX_BYTES) throw new AppError("FILE_SIZE_INVALID", 400, "Documents must be 10 MB or smaller.");

  const storage = await bucket();
  const name = safeName(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = storage.openUploadStream(name, {
    metadata: { userId, kind, mimeType: file.type },
    contentType: file.type
  });
  await new Promise<void>((resolve, reject) => {
    upload.end(buffer, (error?: Error | null) => error ? reject(error) : resolve());
  });

  try {
    const document = await StudentDocument.create({ userId, fileId: upload.id, kind, originalName: name, mimeType: file.type, size: file.size });
    return document.toObject();
  } catch (error) {
    await storage.delete(upload.id).catch(() => undefined);
    throw error;
  }
}

export async function listStudentDocuments(userId: string) {
  await connectDatabase();
  return StudentDocument.find({ userId }).sort({ createdAt: -1 }).lean();
}

export async function readStudentDocument(userId: string, id: string) {
  await connectDatabase();
  const document = await StudentDocument.findOne({ _id: id, userId }).lean();
  if (!document) throw new AppError("DOCUMENT_NOT_FOUND", 404, "Document not found.");
  const storage = await bucket();
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = storage.openDownloadStream(document.fileId);
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  return { document, buffer: Buffer.concat(chunks) };
}

export async function deleteStudentDocument(userId: string, id: string) {
  await connectDatabase();
  const document = await StudentDocument.findOneAndDelete({ _id: id, userId }).lean();
  if (!document) throw new AppError("DOCUMENT_NOT_FOUND", 404, "Document not found.");
  const storage = await bucket();
  await storage.delete(document.fileId).catch(() => undefined);
}
