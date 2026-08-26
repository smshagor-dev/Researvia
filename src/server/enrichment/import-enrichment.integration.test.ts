import { afterAll, describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { connectDatabase } from "@/server/db/mongoose";
import { queueAcademicEnrichmentForImportJob } from "@/server/enrichment/import-enrichment.service";
import { ImportJob } from "@/server/models/ImportJob";
import { ImportRecord } from "@/server/models/ImportRecord";
import { Job } from "@/server/models/Job";
import { Professor } from "@/server/models/Professor";
import { University } from "@/server/models/University";

const marker = `enrichment-import-${Date.now()}`;
const createdIds: { importJob?: string; professor?: string; university?: string } = {};

describe("import-specific professor enrichment", () => {
  it("queues the exact imported professor target", async () => {
    await connectDatabase();
    const university = await University.create({ name: `Test University ${marker}`, slug: `test-university-${marker}`, country: "US", status: "DRAFT" });
    const professor = await Professor.create({ fullName: `Professor ${marker}`, slug: `professor-${marker}`, universityId: university._id, country: "US", status: "DRAFT", openAlexId: `A${Date.now()}` });
    const importJob = await ImportJob.create({ adminUserId: new Types.ObjectId(), entityType: "PROFESSOR", format: "OPENALEX", status: "COMPLETED", totalRows: 1, validRows: 1, processedRows: 1, completedAt: new Date() });
    await ImportRecord.create({ importJobId: importJob._id, rowNumber: 1, status: "IMPORTED", rawData: { fullName: professor.fullName }, normalizedData: {}, targetId: professor._id.toString() });
    createdIds.importJob = importJob._id.toString();
    createdIds.professor = professor._id.toString();
    createdIds.university = university._id.toString();

    const result = await queueAcademicEnrichmentForImportJob(importJob._id.toString());
    expect(result.queued).toBe(1);
    const queued = await Job.findOne({ type: "ENRICH_PROFESSOR_CONTACT", "payload.professorId": professor._id.toString() }).lean();
    expect(queued).toBeTruthy();
    expect(queued?.status).toBe("PENDING");
  }, 15_000);
});

afterAll(async () => {
  if (!createdIds.importJob) return;
  await Promise.all([
    ImportRecord.deleteMany({ importJobId: createdIds.importJob }),
    ImportJob.deleteOne({ _id: createdIds.importJob }),
    Job.deleteMany({ "payload.professorId": createdIds.professor }),
    Professor.deleteOne({ _id: createdIds.professor }),
    University.deleteOne({ _id: createdIds.university })
  ]);
});
