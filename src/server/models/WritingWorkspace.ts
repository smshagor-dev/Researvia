import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const writingVersionSchema = new Schema({
  content: { type: String, required: true, maxlength: 80000 },
  createdBy: { type: String, enum: ["STUDENT", "DETERMINISTIC", "AI"], default: "STUDENT" },
  sourceNotes: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });
const writingWorkspaceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["SOP", "RESEARCH_PROPOSAL"], required: true },
  title: { type: String, required: true, trim: true, maxlength: 260 },
  universityId: { type: Schema.Types.ObjectId, ref: "University", default: null },
  sections: { type: Map, of: String, default: {} },
  citationPlaceholders: { type: [String], default: [] },
  versions: { type: [writingVersionSchema], default: [] },
  status: { type: String, enum: ["DRAFT", "READY", "ARCHIVED"], default: "DRAFT" }
}, { timestamps: true, versionKey: false, strict: "throw" });
writingWorkspaceSchema.index({ userId: 1, type: 1, updatedAt: -1 });

export type WritingWorkspaceDocument = InferSchemaType<typeof writingWorkspaceSchema>;
export const WritingWorkspace = (models.WritingWorkspace as Model<WritingWorkspaceDocument> | undefined) ?? model<WritingWorkspaceDocument>("WritingWorkspace", writingWorkspaceSchema);
