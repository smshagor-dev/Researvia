import { AppError } from "@/server/errors/AppError";
import { createImportPreview } from "@/server/imports/import.service";

const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 300);

export async function createOpenAlexPreview(adminUserId: string, entityType: "UNIVERSITY" | "PROFESSOR", query: string, limit = 25) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const endpoint = entityType === "UNIVERSITY" ? "institutions" : "authors";
  const url = new URL(`https://api.openalex.org/${endpoint}`);
  url.searchParams.set("search", query.trim());
  url.searchParams.set("per-page", String(safeLimit));
  const response = await fetch(url, { headers: { "user-agent": "ResearVia academic discovery platform" } });
  if (!response.ok) throw new AppError("OPENALEX_SYNC_FAILED", 502, "OpenAlex could not be reached.");
  const payload = await response.json() as { results?: Array<Record<string, unknown>> };
  const results = payload.results ?? [];
  if (entityType === "UNIVERSITY") {
    const rows = results.map((raw) => {
      const geo = (raw.geo ?? {}) as Record<string, unknown>;
      const ids = (raw.ids ?? {}) as Record<string, unknown>;
      const name = String(raw.display_name ?? "");
      return {
        name,
        slug: slugify(name),
        country: String(raw.country_code ?? ""),
        city: String(geo.city ?? ""),
        region: String(geo.region ?? ""),
        website: String(raw.homepage_url ?? ""),
        openAlexId: String(raw.id ?? ""),
        rorId: String(ids.ror ?? ""),
        sourceUrl: String(raw.id ?? "")
      };
    });
    return createImportPreview(adminUserId, "UNIVERSITY", "OPENALEX", rows);
  }

  const rows = results.flatMap((raw) => {
    const institutions = Array.isArray(raw.last_known_institutions) ? raw.last_known_institutions as Array<Record<string, unknown>> : [];
    const institution = institutions[0];
    if (!institution) return [];
    const topics = Array.isArray(raw.topics) ? raw.topics as Array<Record<string, unknown>> : [];
    const name = String(raw.display_name ?? "");
    return [{
      fullName: name,
      slug: slugify(name),
      universitySlug: slugify(String(institution.display_name ?? "")),
      country: String(institution.country_code ?? ""),
      orcid: String(raw.orcid ?? ""),
      openAlexId: String(raw.id ?? ""),
      researchAreas: topics.slice(0, 12).map((topic) => String(topic.display_name ?? "")).filter(Boolean),
      sourceUrl: String(raw.id ?? "")
    }];
  });
  if (!rows.length) throw new AppError("OPENALEX_NO_IMPORTABLE_RESULTS", 400, "No OpenAlex authors with an identifiable institution were found. Import universities first and try a narrower search.");
  return createImportPreview(adminUserId, "PROFESSOR", "OPENALEX", rows);
}
