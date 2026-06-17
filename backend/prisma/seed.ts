import { createHash } from 'crypto';
import { Country, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const POPULAR_DESTINATION_CODES = new Set([
  'US', 'GB', 'DE', 'CA', 'AU', 'SE', 'NL', 'CH', 'FR', 'IT', 'ES', 'JP',
  'KR', 'SG', 'CN', 'NZ', 'IE', 'BE', 'DK', 'FI', 'NO', 'AT',
]);

function hashEmail(email: string) {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

type CountriesNowCountry = {
  name?: string;
  iso2?: string;
  iso3?: string;
  unicodeFlag?: string;
  region?: string;
  subregion?: string;
};

async function seedCountriesFromApi() {
  const fallbackCountries = [
    { name: 'Australia', isoAlpha2: 'AU', isoAlpha3: 'AUS', region: 'Oceania', subregion: 'Australia and New Zealand', flagEmoji: '🇦🇺' },
    { name: 'Canada', isoAlpha2: 'CA', isoAlpha3: 'CAN', region: 'Americas', subregion: 'North America', flagEmoji: '🇨🇦' },
    { name: 'Switzerland', isoAlpha2: 'CH', isoAlpha3: 'CHE', region: 'Europe', subregion: 'Western Europe', flagEmoji: '🇨🇭' },
    { name: 'Germany', isoAlpha2: 'DE', isoAlpha3: 'DEU', region: 'Europe', subregion: 'Western Europe', flagEmoji: '🇩🇪' },
    { name: 'United Kingdom', isoAlpha2: 'GB', isoAlpha3: 'GBR', region: 'Europe', subregion: 'Northern Europe', flagEmoji: '🇬🇧' },
    { name: 'Netherlands', isoAlpha2: 'NL', isoAlpha3: 'NLD', region: 'Europe', subregion: 'Western Europe', flagEmoji: '🇳🇱' },
    { name: 'Sweden', isoAlpha2: 'SE', isoAlpha3: 'SWE', region: 'Europe', subregion: 'Northern Europe', flagEmoji: '🇸🇪' },
    { name: 'United States', isoAlpha2: 'US', isoAlpha3: 'USA', region: 'Americas', subregion: 'North America', flagEmoji: '🇺🇸' },
  ];

  let countries: Array<{
    name: string;
    isoAlpha2: string;
    isoAlpha3: string;
    region: string | null;
    subregion: string | null;
    flagEmoji: string | null;
    isPopularDestination: boolean;
  }> = [];

  try {
    const response = await fetch('https://countriesnow.space/api/v0.1/countries/info?returns=iso2,iso3,unicodeFlag,region,subregion');
    if (!response.ok) {
      throw new Error(`CountriesNow returned ${response.status}`);
    }

    const payload = (await response.json()) as { error?: boolean; data?: CountriesNowCountry[] };
    if (!Array.isArray(payload.data)) {
      throw new Error('Country payload did not contain a data array');
    }

    countries = payload.data
      .map((country) => ({
        name: country.name?.trim() || '',
        isoAlpha2: country.iso2?.trim().toUpperCase() || '',
        isoAlpha3: country.iso3?.trim().toUpperCase() || '',
        region: country.region?.trim() || null,
        subregion: country.subregion?.trim() || null,
        flagEmoji: country.unicodeFlag?.trim() || null,
        isPopularDestination: POPULAR_DESTINATION_CODES.has(country.iso2?.trim().toUpperCase() || ''),
      }))
      .filter((country) => country.name && country.isoAlpha2.length === 2 && country.isoAlpha3.length === 3)
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`Loaded ${countries.length} countries from CountriesNow API`);
  } catch (error: any) {
    console.warn(`Country API fetch failed, using fallback list: ${error.message}`);
    countries = fallbackCountries.map((country) => ({
      ...country,
      region: country.region || null,
      subregion: country.subregion || null,
      flagEmoji: country.flagEmoji || null,
      isPopularDestination: POPULAR_DESTINATION_CODES.has(country.isoAlpha2),
    }));
  }

  const result: Country[] = [];
  for (const country of countries) {
    result.push(await prisma.country.upsert({
      where: { isoAlpha2: country.isoAlpha2 },
      update: {
        name: country.name,
        isoAlpha3: country.isoAlpha3,
        region: country.region,
        subregion: country.subregion,
        flagEmoji: country.flagEmoji,
        isPopularDestination: country.isPopularDestination,
      },
      create: country,
    }));
  }

  return result;
}

async function main() {
  console.log('Seeding database...');

  const plans = await Promise.all([
    prisma.subscriptionPlan.upsert({
      where: { slug: 'free' },
      update: {},
      create: {
        name: 'Free',
        slug: 'free',
        priceMonthly: 0,
        priceYearly: 0,
        creditsPerMonth: 20,
        emailSendsPerDay: 5,
        professorRevealsPerMonth: 5,
        aiGenerationsPerMonth: 5,
        opportunityUnlocksPerMonth: 5,
        scholarshipUnlocksPerMonth: 5,
        maxSavedProfessors: 20,
        maxSavedScholarships: 20,
        maxSmtpAccounts: 1,
        maxOauthAccounts: 1,
        hasInboxSync: false,
        hasAiMatchScore: false,
        hasBulkEmail: false,
        hasAnalytics: false,
        sortOrder: 0,
      },
    }),
    prisma.subscriptionPlan.upsert({
      where: { slug: 'starter' },
      update: {},
      create: {
        name: 'Starter',
        slug: 'starter',
        priceMonthly: 9.99,
        priceYearly: 99.99,
        creditsPerMonth: 100,
        emailSendsPerDay: 20,
        professorRevealsPerMonth: 20,
        aiGenerationsPerMonth: 25,
        opportunityUnlocksPerMonth: 20,
        scholarshipUnlocksPerMonth: 20,
        maxSavedProfessors: 100,
        maxSavedScholarships: 100,
        maxSmtpAccounts: 2,
        maxOauthAccounts: 2,
        hasInboxSync: true,
        hasAiMatchScore: false,
        hasBulkEmail: false,
        hasAnalytics: false,
        sortOrder: 1,
      },
    }),
    prisma.subscriptionPlan.upsert({
      where: { slug: 'pro' },
      update: {},
      create: {
        name: 'Pro',
        slug: 'pro',
        priceMonthly: 29.99,
        priceYearly: 299.99,
        creditsPerMonth: 500,
        emailSendsPerDay: 100,
        professorRevealsPerMonth: 100,
        aiGenerationsPerMonth: 100,
        opportunityUnlocksPerMonth: 100,
        scholarshipUnlocksPerMonth: 100,
        maxSavedProfessors: 500,
        maxSavedScholarships: 500,
        maxSmtpAccounts: 5,
        maxOauthAccounts: 5,
        hasInboxSync: true,
        hasAiMatchScore: true,
        hasBulkEmail: true,
        hasAnalytics: true,
        sortOrder: 2,
      },
    }),
    prisma.subscriptionPlan.upsert({
      where: { slug: 'enterprise' },
      update: {},
      create: {
        name: 'Enterprise',
        slug: 'enterprise',
        priceMonthly: 99.99,
        priceYearly: 999.99,
        creditsPerMonth: 2000,
        emailSendsPerDay: 9999,
        professorRevealsPerMonth: 9999,
        aiGenerationsPerMonth: 9999,
        opportunityUnlocksPerMonth: 9999,
        scholarshipUnlocksPerMonth: 9999,
        maxSavedProfessors: 9999,
        maxSavedScholarships: 9999,
        maxSmtpAccounts: 99,
        maxOauthAccounts: 99,
        hasInboxSync: true,
        hasAiMatchScore: true,
        hasBulkEmail: true,
        hasAnalytics: true,
        hasTeamAccess: true,
        sortOrder: 3,
      },
    }),
  ]);

  const passwordHash = await bcrypt.hash('1234567890', 12);
  const existingRequestedAdmin = await prisma.user.findUnique({ where: { email: 'support@smshagor.com' } });
  const legacyAdmin = await prisma.user.findUnique({ where: { email: 'admin@researvia.com' } });

  if (!existingRequestedAdmin && legacyAdmin) {
    await prisma.user.update({
      where: { id: legacyAdmin.id },
      data: {
        email: 'support@smshagor.com',
        passwordHash,
        fullName: 'Platform Admin',
        role: 'super_admin',
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    });
  }

  await prisma.user.upsert({
    where: { email: 'support@smshagor.com' },
    update: {
      passwordHash,
      fullName: 'Platform Admin',
      role: 'super_admin',
      status: 'active',
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'support@smshagor.com',
      passwordHash,
      fullName: 'Platform Admin',
      role: 'super_admin',
      status: 'active',
      emailVerifiedAt: new Date(),
      profile: { create: {} },
      credits: { create: { balance: 9999, lifetimeEarned: 9999 } },
      subscriptions: {
        create: {
          planId: plans[3].id,
          billingCycle: 'yearly',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  const countries = await seedCountriesFromApi();
  const countryByCode = new Map<string, Country>(countries.map((country) => [country.isoAlpha2, country]));

  await prisma.university.updateMany({
    where: { rorId: 'https://ror.org/03vek6s52', name: 'Stanford University' },
    data: { rorId: 'https://ror.org/00f54p054', openalexId: 'https://openalex.org/I97018004' },
  });

  await prisma.university.updateMany({
    where: { rorId: 'https://ror.org/052gg0110', name: 'University of Cambridge' },
    data: { rorId: 'https://ror.org/013meh722', openalexId: 'https://openalex.org/I241749' },
  });

  const universities = await Promise.all([
    prisma.university.upsert({
      where: { rorId: 'https://ror.org/042nb2s44' },
      update: {
        openalexId: 'https://openalex.org/I63966007',
        name: 'Massachusetts Institute of Technology',
        countryId: countryByCode.get('US')!.id,
        city: 'Cambridge',
        websiteUrl: 'https://www.mit.edu',
        qsRanking: 1,
        type: 'research',
        emailDomains: ['mit.edu'],
        status: 'active',
      },
      create: {
        rorId: 'https://ror.org/042nb2s44',
        openalexId: 'https://openalex.org/I63966007',
        name: 'Massachusetts Institute of Technology',
        countryId: countryByCode.get('US')!.id,
        city: 'Cambridge',
        websiteUrl: 'https://www.mit.edu',
        qsRanking: 1,
        type: 'research',
        emailDomains: ['mit.edu'],
        status: 'active',
      },
    }),
    prisma.university.upsert({
      where: { rorId: 'https://ror.org/00f54p054' },
      update: {
        openalexId: 'https://openalex.org/I97018004',
        name: 'Stanford University',
        countryId: countryByCode.get('US')!.id,
        city: 'Stanford',
        websiteUrl: 'https://www.stanford.edu',
        qsRanking: 3,
        type: 'research',
        emailDomains: ['stanford.edu'],
        status: 'active',
      },
      create: {
        rorId: 'https://ror.org/00f54p054',
        openalexId: 'https://openalex.org/I97018004',
        name: 'Stanford University',
        countryId: countryByCode.get('US')!.id,
        city: 'Stanford',
        websiteUrl: 'https://www.stanford.edu',
        qsRanking: 3,
        type: 'research',
        emailDomains: ['stanford.edu'],
        status: 'active',
      },
    }),
    prisma.university.upsert({
      where: { rorId: 'https://ror.org/013meh722' },
      update: {
        openalexId: 'https://openalex.org/I241749',
        name: 'University of Cambridge',
        countryId: countryByCode.get('GB')!.id,
        city: 'Cambridge',
        websiteUrl: 'https://www.cam.ac.uk',
        qsRanking: 2,
        type: 'research',
        emailDomains: ['cam.ac.uk'],
        status: 'active',
      },
      create: {
        rorId: 'https://ror.org/013meh722',
        openalexId: 'https://openalex.org/I241749',
        name: 'University of Cambridge',
        countryId: countryByCode.get('GB')!.id,
        city: 'Cambridge',
        websiteUrl: 'https://www.cam.ac.uk',
        qsRanking: 2,
        type: 'research',
        emailDomains: ['cam.ac.uk'],
        status: 'active',
      },
    }),
  ]);

  const researchAreas = await Promise.all([
    prisma.researchArea.upsert({ where: { slug: 'computer-science' }, update: {}, create: { name: 'Computer Science', slug: 'computer-science', level: 0 } }),
    prisma.researchArea.upsert({ where: { slug: 'machine-learning' }, update: {}, create: { name: 'Machine Learning', slug: 'machine-learning', level: 1 } }),
    prisma.researchArea.upsert({ where: { slug: 'robotics' }, update: {}, create: { name: 'Robotics', slug: 'robotics', level: 1 } }),
    prisma.researchArea.upsert({ where: { slug: 'cybersecurity' }, update: {}, create: { name: 'Cybersecurity', slug: 'cybersecurity', level: 1 } }),
    prisma.researchArea.upsert({ where: { slug: 'natural-language-processing' }, update: {}, create: { name: 'Natural Language Processing', slug: 'natural-language-processing', level: 1 } }),
    prisma.researchArea.upsert({ where: { slug: 'electrical-engineering' }, update: {}, create: { name: 'Electrical Engineering', slug: 'electrical-engineering', level: 0 } }),
    prisma.researchArea.upsert({ where: { slug: 'bioinformatics' }, update: {}, create: { name: 'Bioinformatics', slug: 'bioinformatics', level: 0 } }),
    prisma.researchArea.upsert({ where: { slug: 'quantum-computing' }, update: {}, create: { name: 'Quantum Computing', slug: 'quantum-computing', level: 1 } }),
  ]);

  const depts = await Promise.all([
    prisma.department.upsert({
      where: { universityId_slug: { universityId: universities[0].id, slug: 'eecs' } },
      update: {},
      create: { universityId: universities[0].id, name: 'Department of Electrical Engineering and Computer Science', slug: 'eecs' },
    }),
    prisma.department.upsert({
      where: { universityId_slug: { universityId: universities[1].id, slug: 'cs' } },
      update: {},
      create: { universityId: universities[1].id, name: 'Department of Computer Science', slug: 'cs' },
    }),
  ]);

  const prof1 = await prisma.professor.upsert({
    where: { openalexId: 'A5023888391' },
    update: {
      universityId: universities[0].id,
      departmentId: depts[0].id,
      fullName: 'Dr. Sarah Chen',
      firstName: 'Sarah',
      lastName: 'Chen',
      title: 'Dr.',
      position: 'associate_professor',
      bio: 'Research in machine learning, autonomous systems, and computer vision. PI of the Intelligent Systems Lab.',
      hIndex: 42,
      citationsCount: 8500,
      publicationsCount: 87,
      acceptingStudents: 'yes',
      fundingStatus: 'funded',
      lastPublicationYear: 2024,
      status: 'active',
      verificationStatus: 'verified',
      isPublic: true,
      dataSource: 'manual',
    },
    create: {
      universityId: universities[0].id,
      departmentId: depts[0].id,
      openalexId: 'A5023888391',
      fullName: 'Dr. Sarah Chen',
      firstName: 'Sarah',
      lastName: 'Chen',
      title: 'Dr.',
      position: 'associate_professor',
      bio: 'Research in machine learning, autonomous systems, and computer vision. PI of the Intelligent Systems Lab.',
      hIndex: 42,
      citationsCount: 8500,
      publicationsCount: 87,
      acceptingStudents: 'yes',
      fundingStatus: 'funded',
      lastPublicationYear: 2024,
      status: 'active',
      verificationStatus: 'verified',
      isPublic: true,
      dataSource: 'manual',
    },
  });

  await prisma.professorResearchArea.upsert({
    where: { professorId_researchAreaId: { professorId: prof1.id, researchAreaId: researchAreas[1].id } },
    update: {},
    create: { professorId: prof1.id, researchAreaId: researchAreas[1].id, score: 0.95, isPrimary: true },
  });

  const professorEmail = 'schen@mit.edu';

  await prisma.professorEmail.upsert({
    where: { email: professorEmail },
    update: {},
    create: {
      professorId: prof1.id,
      email: professorEmail,
      emailHash: hashEmail(professorEmail),
      type: 'institutional',
      isPrimary: true,
      isVerified: true,
      verificationStatus: 'verified',
      verificationSource: 'manual_review',
      domainMatched: true,
      mxValid: true,
      verifiedAt: new Date(),
    },
  });

  await prisma.scholarship.upsert({
    where: { slug: 'fulbright-student-program-2025' },
    update: {},
    create: {
      title: 'Fulbright Student Program 2025',
      slug: 'fulbright-student-program-2025',
      description: 'The Fulbright Program offers grants for individually designed study/research projects or for English Teaching Assistant Programs.',
      countryId: countryByCode.get('US')!.id,
      fundingType: 'fully_funded',
      degreeLevels: ['masters', 'phd'],
      eligibility: 'US citizens only. Strong academic record required.',
      officialUrl: 'https://us.fulbrightonline.org',
      source: 'manual',
      isVerified: true,
      isActive: true,
      deadline: new Date('2025-10-15'),
    },
  });

  console.log('Seed complete');
  console.log(`Countries available: ${countries.length}`);
  console.log('Admin: support@smshagor.com / 1234567890');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
