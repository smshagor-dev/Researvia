import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDatabase, disconnectDatabase } from "@/server/db/mongoose";
import { Opportunity } from "@/server/models/Opportunity";
import { Scholarship } from "@/server/models/Scholarship";
import { getDeadlineState, searchOpportunities, searchScholarships } from "@/server/opportunities/opportunity.service";

beforeAll(async () => { process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/researvia_opportunity_ci"; process.env.APP_URL ||= "http://localhost:3000"; process.env.SESSION_SECRET ||= "test-session-secret-value-at-least-32-characters"; process.env.TOKEN_ENCRYPTION_KEY ||= "test-token-encryption-key-at-least-32-characters"; await connectDatabase(); });
beforeEach(async () => { await Promise.all([Scholarship.deleteMany({}), Opportunity.deleteMany({})]); });
afterAll(async () => { await disconnectDatabase(); });

describe("scholarship and opportunity discovery", () => {
  it("classifies deadlines without inventing a deadline", () => { const now = new Date("2026-01-01T00:00:00Z"); expect(getDeadlineState(null, now)).toBe("UNKNOWN"); expect(getDeadlineState("2025-12-31T00:00:00Z", now)).toBe("CLOSED"); expect(getDeadlineState("2026-01-15T00:00:00Z", now)).toBe("CLOSING_SOON"); expect(getDeadlineState("2026-04-01T00:00:00Z", now)).toBe("OPEN"); });
  it("returns only published scholarships", async () => { await Scholarship.create([{ name: "Open Award", slug: "open-award", provider: "University", country: "Germany", applicationUrl: "https://example.edu/apply", sourceUrl: "https://example.edu/award", status: "PUBLISHED" }, { name: "Draft Award", slug: "draft-award", provider: "University", country: "Germany", applicationUrl: "https://example.edu/draft", sourceUrl: "https://example.edu/draft", status: "DRAFT" }]); const result = await searchScholarships({ q: "", country: "Germany", degree: "", fundingType: "", openOnly: false, page: 1, limit: 20 }); expect(result.total).toBe(1); expect(result.items[0]?.name).toBe("Open Award"); });
  it("filters published opportunities by type", async () => { await Opportunity.create({ title: "Research Assistant", slug: "research-assistant", type: "RESEARCH_ASSISTANT", organization: "Example Lab", country: "Canada", applicationUrl: "https://example.org/apply", sourceUrl: "https://example.org/role", status: "PUBLISHED" }); const result = await searchOpportunities({ q: "", country: "Canada", researchArea: "", type: "RESEARCH_ASSISTANT", openOnly: false, page: 1, limit: 20 }); expect(result.total).toBe(1); expect(result.items[0]?.type).toBe("RESEARCH_ASSISTANT"); });
});
