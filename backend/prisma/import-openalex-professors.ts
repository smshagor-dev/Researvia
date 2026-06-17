import { URL } from 'url';
import {
  AcceptingStudents,
  DataSource,
  FundingStatus,
  PrismaClient,
  ProfessorPosition,
  VerificationStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

type OpenAlexAuthor = {
  id: string;
  display_name?: string;
  full_name?: string;
  orcid?: string | null;
  works_count?: number;
  cited_by_count?: number;
  summary_stats?: {
    h_index?: number | null;
    i10_index?: number | null;
  };
  ids?: {
    openalex?: string;
    orcid?: string;
  };
  last_known_institutions?: Array<{
    id?: string;
    display_name?: string;
  }>;
  x_concepts?: Array<{
    display_name?: string;
    score?: number;
    id?: string;
  }>;
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

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'y'].includes(value.toLowerCase());
}

function splitName(fullName: string) {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return {
    firstName: firstName || null,
    lastName: rest.length ? rest.join(' ') : null,
  };
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'research-area';
}

async function fetchAuthors(openalexInstitutionId: string, cursor: string, perPage: number, mailto: string) {
  const url = new URL('/authors', 'https://api.openalex.org');
  url.searchParams.set('filter', `last_known_institutions.id:${openalexInstitutionId}`);
  url.searchParams.set('per-page', String(perPage));
  url.searchParams.set('cursor', cursor);
  if (mailto) url.searchParams.set('mailto', mailto);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenAlex authors API returned ${response.status} for ${openalexInstitutionId}`);
  }

  return response.json() as Promise<{
    meta?: { next_cursor?: string | null };
    results?: OpenAlexAuthor[];
  }>;
}

async function upsertResearchAreas(professorId: string, concepts: OpenAlexAuthor['x_concepts']) {
  const topConcepts = (concepts || [])
    .filter((concept): concept is NonNullable<OpenAlexAuthor['x_concepts']>[number] => Boolean(concept?.display_name))
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, 3);

  for (let index = 0; index < topConcepts.length; index += 1) {
    const concept = topConcepts[index];
    const slug = slugify(String(concept.display_name));
    const area = await prisma.researchArea.upsert({
      where: { slug },
      update: { name: String(concept.display_name), openalexConceptId: concept.id || undefined },
      create: {
        name: String(concept.display_name),
        slug,
        openalexConceptId: concept.id || null,
        level: 0,
      },
    });

    await prisma.professorResearchArea.upsert({
      where: { professorId_researchAreaId: { professorId, researchAreaId: area.id } },
      update: {
        score: concept.score ?? null,
        isPrimary: index === 0,
        source: DataSource.openalex,
      },
      create: {
        professorId,
        researchAreaId: area.id,
        score: concept.score ?? null,
        isPrimary: index === 0,
        source: DataSource.openalex,
      },
    });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const universityLimit = parseNumber(args.universities, 3);
  const perUniversity = parseNumber(args.perUniversity, 200);
  const publish = parseBoolean(args.publish, true);
  const mailto = process.env.OPENALEX_EMAIL || 'ops@researvia.com';

  const universities = await prisma.university.findMany({
    where: { status: 'active', openalexId: { not: null } },
    orderBy: { name: 'asc' },
    take: universityLimit,
    select: { id: true, name: true, openalexId: true },
  });

  if (universities.length === 0) {
    throw new Error('No active universities with openalexId were found.');
  }

  console.log(
    `Importing OpenAlex professors for ${universities.length} universities, up to ${perUniversity} per university. Publish=${publish}`,
  );

  let created = 0;
  let updated = 0;

  for (const university of universities) {
    let importedForUniversity = 0;
    let cursor = '*';

    console.log(`\nUniversity: ${university.name}`);

    while (cursor && importedForUniversity < perUniversity) {
      const batchSize = Math.min(100, perUniversity - importedForUniversity);
      const payload = await fetchAuthors(String(university.openalexId), cursor, batchSize, mailto);
      const authors = Array.isArray(payload.results) ? payload.results : [];

      if (authors.length === 0) {
        break;
      }

      for (const author of authors) {
        const fullName = (author.display_name || author.full_name || '').trim();
        if (!fullName) continue;

        const openalexId = author.ids?.openalex || author.id;
        if (!openalexId) continue;

        const { firstName, lastName } = splitName(fullName);
        const existing = await prisma.professor.findUnique({ where: { openalexId } });

        const professor = existing
          ? await prisma.professor.update({
              where: { openalexId },
              data: {
                universityId: university.id,
                fullName,
                firstName: firstName ?? existing.firstName,
                lastName: lastName ?? existing.lastName,
                position: existing.position || ProfessorPosition.professor,
                openalexId,
                orcidId: author.ids?.orcid || author.orcid || existing.orcidId,
                hIndex: author.summary_stats?.h_index ?? existing.hIndex,
                i10Index: author.summary_stats?.i10_index ?? existing.i10Index,
                citationsCount: author.cited_by_count ?? existing.citationsCount,
                publicationsCount: author.works_count ?? existing.publicationsCount,
                status: 'active',
                dataSource: DataSource.openalex,
                sourceType: DataSource.openalex,
                verificationStatus: publish ? VerificationStatus.verified : VerificationStatus.pending,
                isPublic: publish,
                lastSyncedAt: new Date(),
              },
            })
          : await prisma.professor.create({
              data: {
                universityId: university.id,
                fullName,
                firstName,
                lastName,
                position: ProfessorPosition.professor,
                openalexId,
                orcidId: author.ids?.orcid || author.orcid || null,
                hIndex: author.summary_stats?.h_index ?? null,
                i10Index: author.summary_stats?.i10_index ?? null,
                citationsCount: author.cited_by_count ?? null,
                publicationsCount: author.works_count ?? null,
                acceptingStudents: AcceptingStudents.unknown,
                fundingStatus: FundingStatus.unknown,
                status: 'active',
                dataSource: DataSource.openalex,
                sourceType: DataSource.openalex,
                verificationStatus: publish ? VerificationStatus.verified : VerificationStatus.pending,
                isPublic: publish,
                lastSyncedAt: new Date(),
              },
            });

        await prisma.professorSource.upsert({
          where: {
            professorId_sourceType_externalId: {
              professorId: professor.id,
              sourceType: DataSource.openalex,
              externalId: openalexId,
            },
          },
          update: {
            sourceName: 'OpenAlex',
            sourceUrl: openalexId,
            rawPayloadJson: author,
          },
          create: {
            professorId: professor.id,
            sourceType: DataSource.openalex,
            sourceName: 'OpenAlex',
            externalId: openalexId,
            sourceUrl: openalexId,
            rawPayloadJson: author,
          },
        });

        await upsertResearchAreas(professor.id, author.x_concepts);

        if (existing) {
          updated += 1;
        } else {
          created += 1;
        }

        importedForUniversity += 1;
      }

      cursor = payload.meta?.next_cursor || '';
      console.log(`Imported ${importedForUniversity}/${perUniversity}`);
    }
  }

  const total = await prisma.professor.count();
  const publicTotal = await prisma.professor.count({
    where: { status: 'active', isPublic: true, verificationStatus: 'verified' },
  });

  console.log(`\nDone. Created=${created}, Updated=${updated}, TotalProfessors=${total}, PublicVisible=${publicTotal}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
