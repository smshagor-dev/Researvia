import { Prisma, PrismaClient, UniversityStatus, UniversityType } from '@prisma/client';

const prisma = new PrismaClient();

type OpenAlexInstitution = {
  id?: string;
  ror?: string | null;
  display_name?: string;
  display_name_alternatives?: string[];
  country_code?: string | null;
  homepage_url?: string | null;
  type?: string | null;
  ids?: {
    openalex?: string;
    ror?: string;
    grid?: string;
    wikidata?: string;
  };
  geo?: {
    city?: string | null;
  };
};

function parseArgs(argv: string[]) {
  const options: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...rawValue] = arg.slice(2).split('=');
    options[rawKey] = rawValue.length ? rawValue.join('=') : 'true';
  }
  return options;
}

function parseNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function extractDomain(websiteUrl?: string | null) {
  if (!websiteUrl) return [];
  try {
    const hostname = new URL(websiteUrl).hostname.replace(/^www\./, '').toLowerCase();
    return hostname ? [hostname] : [];
  } catch {
    return [];
  }
}

function normalizeAliases(value?: string[]) {
  if (!Array.isArray(value)) return null;
  const aliases = [...new Set(value.map((item) => item.trim()).filter(Boolean))];
  return aliases.length ? aliases : null;
}

function mapUniversityType(type?: string | null) {
  switch ((type || '').toLowerCase()) {
    case 'education':
      return UniversityType.other;
    default:
      return UniversityType.other;
  }
}

async function fetchInstitutions(cursor: string, perPage: number, mailto: string) {
  const url = new URL('https://api.openalex.org/institutions');
  url.searchParams.set('filter', 'type:education');
  url.searchParams.set('cursor', cursor);
  url.searchParams.set('per-page', String(perPage));
  if (mailto) url.searchParams.set('mailto', mailto);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenAlex institutions API returned ${response.status}`);
  }

  return response.json() as Promise<{
    meta?: { next_cursor?: string | null; count?: number };
    results?: OpenAlexInstitution[];
  }>;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = parseNumber(args.limit, 0);
  const perPage = Math.min(parseNumber(args.perPage, 200), 200);
  const startCursor = args.cursor || '*';
  const mailto = process.env.OPENALEX_EMAIL || 'admin@profcrm.com';

  const countries = await prisma.country.findMany({
    select: { id: true, isoAlpha2: true },
  });
  const countryByCode = new Map(countries.map((country) => [country.isoAlpha2, country.id]));

  const existingUniversities = await prisma.university.findMany({
    select: { id: true, rorId: true, openalexId: true },
  });
  const existingRorIds = new Set(existingUniversities.map((row) => row.rorId).filter(Boolean) as string[]);
  const existingOpenalexIds = new Set(existingUniversities.map((row) => row.openalexId).filter(Boolean) as string[]);

  let cursor = startCursor;
  let processed = 0;
  let created = 0;
  let skippedExisting = 0;
  let skippedMissingCountry = 0;
  let page = 0;

  console.log(`Starting world university import from OpenAlex. Existing=${existingUniversities.length}`);

  while (cursor) {
    const payload = await fetchInstitutions(cursor, perPage, mailto);
    const rows = Array.isArray(payload.results) ? payload.results : [];

    if (rows.length === 0) {
      break;
    }

    const batch: Prisma.UniversityCreateManyInput[] = [];

    for (const row of rows) {
      const openalexId = row.ids?.openalex || row.id || null;
      const rorId = row.ids?.ror || row.ror || null;
      const countryCode = row.country_code?.toUpperCase() || null;
      const countryId = countryCode ? countryByCode.get(countryCode) : null;
      const name = row.display_name?.trim() || '';

      if (!name || !countryId) {
        skippedMissingCountry += 1;
        continue;
      }

      if ((rorId && existingRorIds.has(rorId)) || (openalexId && existingOpenalexIds.has(openalexId))) {
        skippedExisting += 1;
        continue;
      }

      const aliases = normalizeAliases(row.display_name_alternatives);

      batch.push({
        rorId,
        openalexId,
        name,
        ...(aliases ? { nameAliases: aliases } : {}),
        countryId,
        city: row.geo?.city?.trim() || null,
        websiteUrl: row.homepage_url?.trim() || null,
        type: mapUniversityType(row.type),
        emailDomains: extractDomain(row.homepage_url),
        gridId: row.ids?.grid || null,
        wikidataId: row.ids?.wikidata || null,
        status: UniversityStatus.active,
      });

      if (rorId) existingRorIds.add(rorId);
      if (openalexId) existingOpenalexIds.add(openalexId);
    }

    if (batch.length > 0) {
      await prisma.university.createMany({
        data: batch,
        skipDuplicates: true,
      });
      created += batch.length;
    }

    processed += rows.length;
    page += 1;
    console.log(
      `Page ${page}: fetched=${rows.length}, created=${created}, skippedExisting=${skippedExisting}, skippedMissingCountry=${skippedMissingCountry}`,
    );

    if (limit > 0 && created >= limit) {
      console.log(`Reached requested limit=${limit}. Stopping at cursor=${payload.meta?.next_cursor || ''}`);
      break;
    }

    cursor = payload.meta?.next_cursor || '';
  }

  const totalUniversities = await prisma.university.count();
  console.log(
    `Done. TotalUniversities=${totalUniversities}, Created=${created}, SkippedExisting=${skippedExisting}, SkippedMissingCountry=${skippedMissingCountry}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
