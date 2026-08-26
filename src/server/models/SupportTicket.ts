import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const messageSchema = new Schema({
  authorRole: { type: String, enum: ["USER","ADMIN"], required: true },
  body: { type: String, required: true, maxlength: 15000 },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });
const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  category: { type: String, enum: ["QUESTION","BUG","ACCOUNT","MAIL","DATA","FEATURE_REQUEST","OTHER"], default: "QUESTION", index: true },
  subject: { type: String, required: true, trim: true, maxlength: 260 },
  description: { type: String, required: true, maxlength: 15000 },
  priority: { type: String, enum: ["LOW","NORMAL","HIGH","URGENT"], default: "NORMAL", index: true },
  status: { type: String, enum: ["OPEN","IN_PROGRESS","WAITING_USER","RESOLVED","CLOSED"], default: "OPEN", index: true },
  messages: { type: [messageSchema], default: [] },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });
schema.index({ userId: 1, updatedAt: -1 });
schema.index({ status: 1, priority: 1, updatedAt: -1 });
export type SupportTicketDocument = InferSchemaType<typeof schema>;
export const SupportTicket = (models.SupportTicket as Model<SupportTicketDocument> | undefined) ?? model<SupportTicketDocument>("SupportTicket", schema);
