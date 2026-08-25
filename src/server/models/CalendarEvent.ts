import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const calendarEventSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 260 },
  type: { type: String, enum: ["DEADLINE", "INTERVIEW", "FOLLOW_UP", "TASK", "MEETING", "OTHER"], required: true },
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date, default: null },
  timezone: { type: String, default: "UTC", maxlength: 80 },
  sourceType: { type: String, enum: ["MANUAL", "APPLICATION", "OUTREACH", "SCHOLARSHIP", "OPPORTUNITY"], default: "MANUAL" },
  sourceId: { type: Schema.Types.ObjectId, default: null },
  notes: { type: String, default: "", maxlength: 5000 },
  reminderMinutes: { type: [Number], default: [1440] }
}, { timestamps: true, versionKey: false, strict: "throw" });
calendarEventSchema.index({ userId: 1, startsAt: 1 });
calendarEventSchema.index({ userId: 1, sourceType: 1, sourceId: 1 });

export type CalendarEventDocument = InferSchemaType<typeof calendarEventSchema>;
export const CalendarEvent = (models.CalendarEvent as Model<CalendarEventDocument> | undefined) ?? model<CalendarEventDocument>("CalendarEvent", calendarEventSchema);
