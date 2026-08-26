import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const applicationPacketDocumentKinds = ["CV","TRANSCRIPT","DEGREE_CERTIFICATE","ENROLLMENT_CERTIFICATE","MOTIVATION_LETTER","SOP","PROPOSAL","LANGUAGE_CERTIFICATE","COURSE_CERTIFICATE","PUBLICATION","PASSPORT","OTHER"] as const;
const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true, index: true },
  requiredDocumentKinds: { type: [{ type: String, enum: applicationPacketDocumentKinds }], default: ["CV"] },
  recommendationsRequired: { type: Number, default: 0, min: 0, max: 5 }
}, { timestamps: true, versionKey: false, strict: "throw" });
schema.index({ userId: 1, applicationId: 1 }, { unique: true });
export type ApplicationPacketDocument = InferSchemaType<typeof schema>;
export const ApplicationPacket = (models.ApplicationPacket as Model<ApplicationPacketDocument> | undefined) ?? model<ApplicationPacketDocument>("ApplicationPacket", schema);
