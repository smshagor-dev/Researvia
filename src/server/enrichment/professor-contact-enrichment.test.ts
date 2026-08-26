import { describe, expect, it } from "vitest";
import { emailMatchesOfficialDomain, extractOrcidResearcherUrls, normalizeOrcidId, normalizeRorId, selectOrcidEmail, selectOrcidEmployment } from "@/server/enrichment/professor-contact-enrichment.service";

describe("professor contact enrichment parsing", () => {
  it("normalizes public identifiers", () => {
    expect(normalizeOrcidId("https://orcid.org/0000-0002-1825-0097")).toBe("0000-0002-1825-0097");
    expect(normalizeRorId("https://ror.org/03yrm5c26")).toBe("03yrm5c26");
  });

  it("prefers a verified ORCID email on the university domain", () => {
    const selected = selectOrcidEmail({ email: [
      { email: "person@gmail.com", primary: true, verified: true },
      { email: "person@cs.example.edu", primary: false, verified: true }
    ] }, ["example.edu"]);
    expect(selected?.email).toBe("person@cs.example.edu");
    expect(selected?.confidence).toBe("HIGH");
    expect(emailMatchesOfficialDomain("person@lab.example.edu", ["example.edu"])).toBe(true);
  });

  it("keeps only safe HTTPS researcher URLs", () => {
    expect(extractOrcidResearcherUrls({ "researcher-url": [
      { url: { value: "https://example.edu/~person" } },
      { url: { value: "http://example.edu/insecure" } },
      { url: { value: "https://localhost/profile" } }
    ] })).toEqual(["https://example.edu/~person"]);
  });

  it("selects the active employment matching the university", () => {
    const selected = selectOrcidEmployment({ "affiliation-group": [{ summaries: [{ "employment-summary": {
      "role-title": "Associate Professor",
      "department-name": "Computer Science",
      organization: { name: "Example University", "disambiguated-organization": { "disambiguated-organization-identifier": "https://ror.org/03yrm5c26" } }
    } }] }] }, { name: "Example University", ror: "03yrm5c26" });
    expect(selected).toMatchObject({ title: "Associate Professor", department: "Computer Science", active: true });
  });
});
