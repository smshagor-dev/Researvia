import { prepareOpportunityDatabase } from "@/server/db/opportunity-indexes";
import { prepareSavedDatabase } from "@/server/db/saved-indexes";
import { AppError } from "@/server/errors/AppError";
import { Opportunity } from "@/server/models/Opportunity";
import { SavedItem } from "@/server/models/SavedItem";
import { Scholarship } from "@/server/models/Scholarship";

export type ComparisonItem = {
  savedId: string;
  targetId: string;
  title: string;
  href: string;
  fields: Record<string, string>;
};

export type ComparisonResult = {
  type: "SCHOLARSHIP" | "OPPORTUNITY";
  labels: string[];
  items: ComparisonItem[];
};

function formatDate(value: unknown): string {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value as Date)) : "Unknown";
}

function list(value: unknown): string {
  return Array.isArray(value) && value.length ? value.map(String).join(", ") : "Not provided";
}

export async function compareSavedItems(userId: string, requestedIds: string[]): Promise<ComparisonResult> {
  await Promise.all([prepareSavedDatabase(), prepareOpportunityDatabase()]);
  const ids = [...new Set(requestedIds)].slice(0, 5);
  if (ids.length < 2 || ids.length > 4 || ids.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
    throw new AppError("INVALID_COMPARISON", 400, "Choose between two and four saved scholarships or opportunities.");
  }

  const saved = await SavedItem.find({ _id: { $in: ids }, userId, itemType: { $in: ["SCHOLARSHIP", "OPPORTUNITY"] } }).lean();
  if (saved.length !== ids.length) throw new AppError("INVALID_COMPARISON", 400, "One or more selected items cannot be compared.");
  const byId = new Map(saved.map((item) => [String(item._id), item]));
  const ordered = ids.map((id) => byId.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const type = String(ordered[0]?.itemType) as "SCHOLARSHIP" | "OPPORTUNITY";
  if (ordered.some((item) => item.itemType !== type)) throw new AppError("MIXED_COMPARISON", 400, "Compare scholarships with scholarships, or opportunities with opportunities.");

  if (type === "SCHOLARSHIP") {
    const targets = await Scholarship.find({ _id: { $in: ordered.map((item) => item.targetId) }, status: "PUBLISHED" }).populate("universityId", "name").lean();
    const targetMap = new Map(targets.map((item) => [String(item._id), item]));
    if (targets.length !== ordered.length) throw new AppError("COMPARISON_SOURCE_UNAVAILABLE", 409, "One or more scholarship records are no longer published.");
    const labels = ["Provider", "Country", "University", "Funding", "Funding amount", "Deadline", "Degree levels", "Study fields", "Language requirements", "Required documents", "Eligibility"];
    return {
      type,
      labels,
      items: ordered.map((savedItem) => {
        const item = targetMap.get(String(savedItem.targetId));
        if (!item) throw new AppError("COMPARISON_SOURCE_UNAVAILABLE", 409, "Scholarship record unavailable.");
        const university = item.universityId && typeof item.universityId === "object" ? item.universityId as unknown as { name?: string } : {};
        return {
          savedId: String(savedItem._id),
          targetId: String(item._id),
          title: item.name,
          href: `/dashboard/scholarships/${item.slug}`,
          fields: {
            Provider: item.provider,
            Country: item.country,
            University: university.name ?? "Not provided",
            Funding: item.fundingType,
            "Funding amount": item.fundingAmount || "Not provided",
            Deadline: formatDate(item.deadline),
            "Degree levels": list(item.degreeLevels),
            "Study fields": list(item.studyFields),
            "Language requirements": list(item.languageRequirements),
            "Required documents": list(item.requiredDocuments),
            Eligibility: item.eligibility || "Not provided"
          }
        };
      })
    };
  }

  const targets = await Opportunity.find({ _id: { $in: ordered.map((item) => item.targetId) }, status: "PUBLISHED" }).populate("universityId", "name").lean();
  const targetMap = new Map(targets.map((item) => [String(item._id), item]));
  if (targets.length !== ordered.length) throw new AppError("COMPARISON_SOURCE_UNAVAILABLE", 409, "One or more opportunity records are no longer published.");
  const labels = ["Organization", "Type", "Country", "University", "Funding", "Deadline", "Fields", "Research areas", "Required documents", "Eligibility"];
  return {
    type,
    labels,
    items: ordered.map((savedItem) => {
      const item = targetMap.get(String(savedItem.targetId));
      if (!item) throw new AppError("COMPARISON_SOURCE_UNAVAILABLE", 409, "Opportunity record unavailable.");
      const university = item.universityId && typeof item.universityId === "object" ? item.universityId as unknown as { name?: string } : {};
      return {
        savedId: String(savedItem._id),
        targetId: String(item._id),
        title: item.title,
        href: `/dashboard/opportunities/${item.slug}`,
        fields: {
          Organization: item.organization,
          Type: item.type.replaceAll("_", " "),
          Country: item.country,
          University: university.name ?? "Not provided",
          Funding: item.funding || "Not provided",
          Deadline: formatDate(item.deadline),
          Fields: list(item.fields),
          "Research areas": list(item.researchAreas),
          "Required documents": list(item.requiredDocuments),
          Eligibility: item.eligibility || "Not provided"
        }
      };
    })
  };
}
