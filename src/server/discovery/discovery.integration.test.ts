import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDatabase, disconnectDatabase } from "@/server/db/mongoose";
import { Professor } from "@/server/models/Professor";
import { University } from "@/server/models/University";
import { getProfessorBySlug, getUniversityBySlug, searchProfessors, searchUniversities } from "@/server/discovery/discovery.service";

beforeAll(async () => {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/researvia_discovery_ci";
  process.env.APP_URL ||= "http://localhost:3000";
  process.env.SESSION_SECRET ||= "test-session-secret-value-at-least-32-characters";
  process.env.TOKEN_ENCRYPTION_KEY ||= "test-token-encryption-key-at-least-32-characters";
  await connectDatabase();
});

beforeEach(async () => {
  await Promise.all([Professor.deleteMany({}), University.deleteMany({})]);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("university and professor discovery", () => {
  it("returns only published universities and resolves details by slug", async () => {
    await University.create([
      { name: "Alpha University", slug: "alpha-university", country: "Germany", status: "PUBLISHED" },
      { name: "Hidden University", slug: "hidden-university", country: "Germany", status: "DRAFT" }
    ]);
    const result = await searchUniversities({ q: "", country: "Germany", page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(result.items[0]?.name).toBe("Alpha University");
    await expect(getUniversityBySlug("alpha-university")).resolves.toMatchObject({ country: "Germany" });
  });

  it("filters published professors and includes their university", async () => {
    const university = await University.create({ name: "Beta University", slug: "beta-university", country: "Canada", status: "PUBLISHED" });
    await Professor.create({
      fullName: "Ada Researcher", slug: "ada-researcher", universityId: university._id, country: "Canada", department: "Computer Science",
      researchAreas: ["Machine Learning"], status: "PUBLISHED"
    });
    const result = await searchProfessors({ q: "", country: "Canada", researchArea: "", universityId: university._id.toString(), page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(result.items[0]?.universityName).toBe("Beta University");
    await expect(getProfessorBySlug("ada-researcher")).resolves.toMatchObject({ fullName: "Ada Researcher" });
  });
});
