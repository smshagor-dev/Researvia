import { connectDatabase } from "@/server/db/mongoose";
import { AnalyticsEvent } from "@/server/models/AnalyticsEvent";
import { DataChangeEvent } from "@/server/models/DataChangeEvent";
import { FeatureFlag } from "@/server/models/FeatureFlag";
import { Opportunity } from "@/server/models/Opportunity";
import { Paper } from "@/server/models/Paper";
import { Professor } from "@/server/models/Professor";
import { ResearchLab } from "@/server/models/ResearchLab";
import { Scholarship } from "@/server/models/Scholarship";

const staleBefore = () => new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

export async function getDataQualitySummary() {
  await connectDatabase();
  const stale = staleBefore();
  const [scholarshipTotal, scholarshipDeadlineUnknown, scholarshipFundingUnknown, scholarshipStale, opportunityTotal, opportunityDeadlineUnknown, opportunityFundingUnknown, opportunityStale, professorTotal, professorNoPublicContact, professorStale, labTotal, labStale, paperTotal, paperStale, recentChanges] = await Promise.all([
    Scholarship.countDocuments({ status: "PUBLISHED" }),
    Scholarship.countDocuments({ status: "PUBLISHED", deadline: null }),
    Scholarship.countDocuments({ status: "PUBLISHED", fundingType: "UNKNOWN" }),
    Scholarship.countDocuments({ status: "PUBLISHED", $or: [{ lastVerifiedAt: null }, { lastVerifiedAt: { $lt: stale } }] }),
    Opportunity.countDocuments({ status: "PUBLISHED" }),
    Opportunity.countDocuments({ status: "PUBLISHED", deadline: null }),
    Opportunity.countDocuments({ status: "PUBLISHED", funding: "" }),
    Opportunity.countDocuments({ status: "PUBLISHED", $or: [{ lastVerifiedAt: null }, { lastVerifiedAt: { $lt: stale } }] }),
    Professor.countDocuments({ status: "PUBLISHED" }),
    Professor.countDocuments({ status: "PUBLISHED", email: "", website: "" }),
    Professor.countDocuments({ status: "PUBLISHED", $or: [{ lastVerifiedAt: null }, { lastVerifiedAt: { $lt: stale } }] }),
    ResearchLab.countDocuments({ status: "PUBLISHED" }),
    ResearchLab.countDocuments({ status: "PUBLISHED", $or: [{ lastVerifiedAt: null }, { lastVerifiedAt: { $lt: stale } }] }),
    Paper.countDocuments({ status: "PUBLISHED" }),
    Paper.countDocuments({ status: "PUBLISHED", $or: [{ lastVerifiedAt: null }, { lastVerifiedAt: { $lt: stale } }] }),
    DataChangeEvent.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
  ]);
  return {
    staleThresholdDays: 90,
    recentChanges,
    sections: [
      { key: "scholarships", label: "Scholarships", total: scholarshipTotal, issues: [{ label: "Deadline unknown", count: scholarshipDeadlineUnknown }, { label: "Funding unknown", count: scholarshipFundingUnknown }, { label: "Verification stale / missing", count: scholarshipStale }] },
      { key: "opportunities", label: "Opportunities", total: opportunityTotal, issues: [{ label: "Deadline unknown", count: opportunityDeadlineUnknown }, { label: "Funding details missing", count: opportunityFundingUnknown }, { label: "Verification stale / missing", count: opportunityStale }] },
      { key: "professors", label: "Professors", total: professorTotal, issues: [{ label: "No public email or website", count: professorNoPublicContact }, { label: "Verification stale / missing", count: professorStale }] },
      { key: "labs", label: "Research labs", total: labTotal, issues: [{ label: "Verification stale / missing", count: labStale }] },
      { key: "papers", label: "Papers", total: paperTotal, issues: [{ label: "Verification stale / missing", count: paperStale }] }
    ]
  };
}

export async function getAnalyticsSummary(days = 30) {
  await connectDatabase();
  const since = new Date(Date.now() - Math.max(1, Math.min(days, 365)) * 24 * 60 * 60 * 1000);
  const [byType, byCountry, byField, total] = await Promise.all([
    AnalyticsEvent.aggregate<{ _id: string; count: number }>([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: "$type", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    AnalyticsEvent.aggregate<{ _id: string; count: number }>([{ $match: { createdAt: { $gte: since }, country: { $ne: "" } } }, { $group: { _id: "$country", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 12 }]),
    AnalyticsEvent.aggregate<{ _id: string; count: number }>([{ $match: { createdAt: { $gte: since }, field: { $ne: "" } } }, { $group: { _id: "$field", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 12 }]),
    AnalyticsEvent.countDocuments({ createdAt: { $gte: since } })
  ]);
  return { days, total, byType: byType.map((item) => ({ label: item._id, count: item.count })), byCountry: byCountry.map((item) => ({ label: item._id, count: item.count })), byField: byField.map((item) => ({ label: item._id, count: item.count })) };
}

export async function listFeatureFlags() {
  await connectDatabase();
  return FeatureFlag.find().sort({ key: 1 }).lean();
}

export async function upsertFeatureFlag(adminUserId: string, input: { key: string; description: string; enabled: boolean; environments: string[]; allowedRoles: string[]; rolloutPercent: number }) {
  await connectDatabase();
  return FeatureFlag.findOneAndUpdate({ key: input.key }, { $set: { ...input, updatedBy: adminUserId } }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }).lean();
}
