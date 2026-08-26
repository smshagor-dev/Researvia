import type { MetadataRoute } from "next";
import { connectDatabase } from "@/server/db/mongoose";
import { Opportunity } from "@/server/models/Opportunity";
import { Professor } from "@/server/models/Professor";
import { PublicStudentProfile } from "@/server/models/PublicStudentProfile";
import { Scholarship } from "@/server/models/Scholarship";
import { University } from "@/server/models/University";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/professors`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/universities`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/scholarships`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/opportunities`, changeFrequency: "daily", priority: 0.9 }
  ];

  try {
    await connectDatabase();
    const [professors, universities, scholarships, opportunities, students] = await Promise.all([
      Professor.find({ status: "PUBLISHED" }).select("slug updatedAt").sort({ updatedAt: -1 }).limit(10000).lean(),
      University.find({ status: "PUBLISHED" }).select("slug updatedAt").sort({ updatedAt: -1 }).limit(10000).lean(),
      Scholarship.find({ status: "PUBLISHED" }).select("slug updatedAt").sort({ updatedAt: -1 }).limit(10000).lean(),
      Opportunity.find({ status: "PUBLISHED" }).select("slug updatedAt").sort({ updatedAt: -1 }).limit(10000).lean(),
      PublicStudentProfile.find({ enabled: true }).select("slug updatedAt").sort({ updatedAt: -1 }).limit(10000).lean()
    ]);
    return [
      ...staticEntries,
      ...professors.map((item) => ({ url: `${base}/professors/${item.slug}`, lastModified: new Date(item.updatedAt), changeFrequency: "weekly" as const, priority: 0.7 })),
      ...universities.map((item) => ({ url: `${base}/universities/${item.slug}`, lastModified: new Date(item.updatedAt), changeFrequency: "weekly" as const, priority: 0.7 })),
      ...scholarships.map((item) => ({ url: `${base}/scholarships/${item.slug}`, lastModified: new Date(item.updatedAt), changeFrequency: "daily" as const, priority: 0.8 })),
      ...opportunities.map((item) => ({ url: `${base}/opportunities/${item.slug}`, lastModified: new Date(item.updatedAt), changeFrequency: "daily" as const, priority: 0.8 })),
      ...students.map((item) => ({ url: `${base}/students/${item.slug}`, lastModified: new Date(item.updatedAt), changeFrequency: "weekly" as const, priority: 0.5 }))
    ];
  } catch {
    return staticEntries;
  }
}
