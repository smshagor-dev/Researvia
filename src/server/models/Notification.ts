import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, required: true, maxlength: 80, index: true },
  title: { type: String, required: true, maxlength: 180 },
  message: { type: String, required: true, maxlength: 1200 },
  href: { type: String, default: null, maxlength: 500 },
  dedupeKey: { type: String, default: null, maxlength: 260 },
  metadata: { type: Schema.Types.Mixed, default: {} },
  readAt: { type: Date, default: null, index: true }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ userId: 1, readAt: 1, createdAt: -1 });
schema.index({ userId: 1, dedupeKey: 1 }, { unique: true, sparse: true });
export type NotificationDocument = InferSchemaType<typeof schema>;
export const Notification = (models.Notification as Model<NotificationDocument> | undefined) ?? model<NotificationDocument>("Notification", schema);
