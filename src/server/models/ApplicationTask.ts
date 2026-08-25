import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { applicationTaskPriorities } from "@/schemas/applications";

const applicationTaskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    notes: { type: String, default: "", trim: true, maxlength: 2000 },
    dueAt: { type: Date, default: null },
    priority: { type: String, enum: applicationTaskPriorities, default: "MEDIUM" },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false, strict: "throw" }
);

applicationTaskSchema.index({ userId: 1, applicationId: 1, completedAt: 1, dueAt: 1 });

export type ApplicationTaskDocument = InferSchemaType<typeof applicationTaskSchema>;
export const ApplicationTask = (models.ApplicationTask as Model<ApplicationTaskDocument> | undefined) ?? model<ApplicationTaskDocument>("ApplicationTask", applicationTaskSchema);
