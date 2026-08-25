import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { applicationStatuses } from "@/schemas/applications";

const applicationTimelineSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    type: { type: String, enum: ["CREATED", "STATUS_CHANGE", "DEADLINE_CHANGE", "NOTE"], required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    fromStatus: { type: String, enum: applicationStatuses, default: null },
    toStatus: { type: String, enum: applicationStatuses, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false, strict: "throw" }
);

applicationTimelineSchema.index({ userId: 1, applicationId: 1, createdAt: -1 });

export type ApplicationTimelineDocument = InferSchemaType<typeof applicationTimelineSchema>;
export const ApplicationTimeline = (models.ApplicationTimeline as Model<ApplicationTimelineDocument> | undefined) ?? model<ApplicationTimelineDocument>("ApplicationTimeline", applicationTimelineSchema);
