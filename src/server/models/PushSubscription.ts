import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  endpoint: { type: String, required: true, maxlength: 3000, unique: true, index: true },
  keys: {
    p256dh: { type: String, required: true, maxlength: 1000 },
    auth: { type: String, required: true, maxlength: 1000 }
  },
  expirationTime: { type: Date, default: null },
  userAgent: { type: String, default: "", maxlength: 500 },
  enabled: { type: Boolean, default: true, index: true },
  lastSuccessAt: { type: Date, default: null },
  lastFailureAt: { type: Date, default: null },
  failureCount: { type: Number, default: 0, min: 0 },
  lastError: { type: String, default: "", maxlength: 500 }
}, { timestamps: true, versionKey: false, strict: "throw" });

schema.index({ userId: 1, enabled: 1, updatedAt: -1 });
export type PushSubscriptionDocument = InferSchemaType<typeof schema>;
export const PushSubscription = (models.PushSubscription as Model<PushSubscriptionDocument> | undefined) ?? model<PushSubscriptionDocument>("PushSubscription", schema);
