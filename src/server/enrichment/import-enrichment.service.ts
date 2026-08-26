import { connectDatabase } from "@/server/db/mongoose";
import { ImportJob } from "@/server/models/ImportJob";
import { ImportRecord } from "@/server/models/ImportRecord";
import { queueProfessorContactEnrichment, queueUniversityMetadataEnrichment } from "@/server/enrichment/professor-contact-enrichment.service";

export async function queueAcademicEnrichmentForImportJob(importJobId: string) {
  await connectDatabase();
  const job = await ImportJob.findById(importJobId).select("entityType status").lean();
  if (!job || job.status !== "COMPLETED" || !["PROFESSOR", "UNIVERSITY"].includes(job.entityType)) return { queued: 0 };
  const records = await ImportRecord.find({ importJobId, status: "IMPORTED", targetId: { $ne: null } }).select("targetId").lean();
  let queued = 0;
  for (const item of records) {
    if (!item.targetId) continue;
    const targetId = item.targetId.toString();
    const accepted = job.entityType === "PROFESSOR"
      ? await queueProfessorContactEnrichment(targetId, "import-complete")
      : await queueUniversityMetadataEnrichment(targetId, "import-complete");
    if (accepted) queued += 1;
  }
  return { queued };
}
