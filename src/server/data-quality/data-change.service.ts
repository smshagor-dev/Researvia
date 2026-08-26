import { connectDatabase } from "@/server/db/mongoose";
import { DataChangeEvent } from "@/server/models/DataChangeEvent";

type SupportedEntity = "SCHOLARSHIP" | "OPPORTUNITY";
type ActorType = "SYSTEM" | "ADMIN" | "IMPORT";

function asTimestamp(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

function display(value: Date | string | null | undefined): string {
  const time = asTimestamp(value);
  return time === null ? "" : new Date(time).toISOString();
}

export async function recordDeadlineChange(input: {
  entityType: SupportedEntity;
  entityId: string;
  previousDeadline: Date | string | null | undefined;
  nextDeadline: Date | string | null | undefined;
  sourceUrl?: string;
  actorType: ActorType;
  verifiedAt?: Date;
}) {
  const previous = asTimestamp(input.previousDeadline);
  const next = asTimestamp(input.nextDeadline);
  if (previous === next) return null;
  await connectDatabase();
  return DataChangeEvent.create({
    entityType: input.entityType,
    entityId: input.entityId,
    field: "deadline",
    previousValue: display(input.previousDeadline),
    nextValue: display(input.nextDeadline),
    sourceUrl: input.sourceUrl ?? "",
    verifiedAt: input.verifiedAt ?? new Date(),
    actorType: input.actorType
  });
}
