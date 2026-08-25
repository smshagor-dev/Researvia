import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { applicationSourceTypes, applicationStatuses } from "@/schemas/applications";

const applicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sourceType: { type: String, enum: applicationSourceTypes, required: true, default: "MANUAL" },
    sourceId: { type: Schema.Types.ObjectId, default: null },
    sourceSlug: { type: String, default: "", trim: true, maxlength: 320 },
    sourceUrl: { type: String, default: "", trim: true, maxlength: 700 },
    applicationUrl: { type: String, default: "", trim: true, maxlength: 700 },
    sourceTitleSnapshot: { type: String, default: "", trim: true, maxlength: 300 },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    organization: { type: String, default: "", trim: true, maxlength: 240 },
    university: { type: String, default: "", trim: true, maxlength: 240 },
    country: { type: String, default: "", trim: true, maxlength: 120 },
    contactName: { type: String, default: "", trim: true, maxlength: 180 },
    contactEmail: { type: String, default: "", trim: true, lowercase: true, maxlength: 320 },
    deadline: { type: Date, default: null },
    status: { type: String, enum: applicationStatuses, default: "INTERESTED", required: true },
    notes: { type: String, default: "", trim: true, maxlength: 5000 }
  },
  { timestamps: true, versionKey: false, strict: "throw" }
);

applicationSchema.index({ userId: 1, status: 1, updatedAt: -1 });
applicationSchema.index({ userId: 1, deadline: 1 });
applicationSchema.index(
  { userId: 1, sourceType: 1, sourceId: 1 },
  { unique: true, partialFilterExpression: { sourceId: { $type: "objectId" } } }
);

export type ApplicationDocument = InferSchemaType<typeof applicationSchema>;
export const Application = (models.Application as Model<ApplicationDocument> | undefined) ?? model<ApplicationDocument>("Application", applicationSchema);
