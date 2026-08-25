import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const milestoneSchema = new Schema({ title: { type: String, required: true, maxlength: 240 }, dueAt: { type: Date, default: null }, completedAt: { type: Date, default: null } }, { _id: true });
const researchProjectSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 300 },
  hypothesis: { type: String, default: "", maxlength: 5000 },
  methodology: { type: String, default: "", maxlength: 10000 },
  notes: { type: String, default: "", maxlength: 20000 },
  references: { type: [String], default: [] },
  collaboratorNames: { type: [String], default: [] },
  documentIds: { type: [{ type: Schema.Types.ObjectId, ref: "StudentDocument" }], default: [] },
  milestones: { type: [milestoneSchema], default: [] },
  status: { type: String, enum: ["IDEA", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"], default: "IDEA" },
  isPublic: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false, strict: "throw" });
researchProjectSchema.index({ userId: 1, status: 1, updatedAt: -1 });

export type ResearchProjectDocument = InferSchemaType<typeof researchProjectSchema>;
export const ResearchProject = (models.ResearchProject as Model<ResearchProjectDocument> | undefined) ?? model<ResearchProjectDocument>("ResearchProject", researchProjectSchema);
