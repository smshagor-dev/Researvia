import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 260 },
  notes: { type: String, default: "", maxlength: 8000 },
  status: { type: String, enum: ["TODO","IN_PROGRESS","DONE","CANCELLED"], default: "TODO", index: true },
  priority: { type: String, enum: ["LOW","MEDIUM","HIGH","URGENT"], default: "MEDIUM" },
  category: { type: String, enum: ["APPLICATION","RESEARCH","OUTREACH","DOCUMENT","EXAM","PERSONAL","OTHER"], default: "OTHER", index: true },
  dueAt: { type: Date, default: null, index: true },
  reminderAt: { type: Date, default: null, index: true },
  linkedType: { type: String, enum: ["NONE","APPLICATION","PROFESSOR","SCHOLARSHIP","OPPORTUNITY","CONTACT"], default: "NONE" },
  linkedId: { type: Schema.Types.ObjectId, default: null },
  tags: { type: [String], default: [] },
  completedAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false, strict: "throw" });
schema.index({ userId: 1, status: 1, dueAt: 1 });
schema.index({ userId: 1, reminderAt: 1 });
export type PlannerTaskDocument = InferSchemaType<typeof schema>;
export const PlannerTask = (models.PlannerTask as Model<PlannerTaskDocument> | undefined) ?? model<PlannerTaskDocument>("PlannerTask", schema);
