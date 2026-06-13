import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Subscription Plans
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
        emailSendsPerDay: 10,
        professorRevealsPerMonth: 5,
        aiGenerationsPerMonth: 5,
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
        emailSendsPerDay: 50,
        professorRevealsPerMonth: 20,
        aiGenerationsPerMonth: 20,
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
        emailSendsPerDay: 200,
        professorRevealsPerMonth: 100,
        aiGenerationsPerMonth: 100,
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
        maxSavedProfessors: 9999,
        maxSavedScholarships: 9999,
        maxSmtpAccounts: 99,
        maxOauthAccounts: 99,
        hasInboxSync: true,
        hasAiMatchScore: true,
        hasBulkEmail: true,
        hasAnalytics: true,
        sortOrder: 3,
      },
    }),
  ]);

  // Super Admin User
  const passwordHash = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@profcrm.com' },
    update: {},
    create: {
      email: 'admin@profcrm.com',
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
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  // Sample Countries
  const countries = await Promise.all([
    prisma.country.upsert({ where: { isoAlpha2: 'US' }, update: {}, create: { name: 'United States', isoAlpha2: 'US', isoAlpha3: 'USA', region: 'Americas', flagEmoji: '🇺🇸', isPopularDestination: true } }),
    prisma.country.upsert({ where: { isoAlpha2: 'GB' }, update: {}, create: { name: 'United Kingdom', isoAlpha2: 'GB', isoAlpha3: 'GBR', region: 'Europe', flagEmoji: '🇬🇧', isPopularDestination: true } }),
    prisma.country.upsert({ where: { isoAlpha2: 'DE' }, update: {}, create: { name: 'Germany', isoAlpha2: 'DE', isoAlpha3: 'DEU', region: 'Europe', flagEmoji: '🇩🇪', isPopularDestination: true } }),
    prisma.country.upsert({ where: { isoAlpha2: 'CA' }, update: {}, create: { name: 'Canada', isoAlpha2: 'CA', isoAlpha3: 'CAN', region: 'Americas', flagEmoji: '🇨🇦', isPopularDestination: true } }),
    prisma.country.upsert({ where: { isoAlpha2: 'AU' }, update: {}, create: { name: 'Australia', isoAlpha2: 'AU', isoAlpha3: 'AUS', region: 'Oceania', flagEmoji: '🇦🇺', isPopularDestination: true } }),
    prisma.country.upsert({ where: { isoAlpha2: 'SE' }, update: {}, create: { name: 'Sweden', isoAlpha2: 'SE', isoAlpha3: 'SWE', region: 'Europe', flagEmoji: '🇸🇪', isPopularDestination: true } }),
    prisma.country.upsert({ where: { isoAlpha2: 'NL' }, update: {}, create: { name: 'Netherlands', isoAlpha2: 'NL', isoAlpha3: 'NLD', region: 'Europe', flagEmoji: '🇳🇱', isPopularDestination: true } }),
    prisma.country.upsert({ where: { isoAlpha2: 'CH' }, update: {}, create: { name: 'Switzerland', isoAlpha2: 'CH', isoAlpha3: 'CHE', region: 'Europe', flagEmoji: '🇨🇭', isPopularDestination: true } }),
  ]);

  // Sample Universities
  const universities = await Promise.all([
    prisma.university.upsert({
      where: { rorId: 'https://ror.org/042nb2s44' },
      update: {},
      create: {
        rorId: 'https://ror.org/042nb2s44',
        name: 'Massachusetts Institute of Technology',
        countryId: countries[0].id,
        city: 'Cambridge',
        websiteUrl: 'https://www.mit.edu',
        qsRanking: 1,
        type: 'research',
        emailDomains: ['mit.edu'],
        status: 'active',
      },
    }),
    prisma.university.upsert({
      where: { rorId: 'https://ror.org/03vek6s52' },
      update: {},
      create: {
        rorId: 'https://ror.org/03vek6s52',
        name: 'Stanford University',
        countryId: countries[0].id,
        city: 'Stanford',
        websiteUrl: 'https://www.stanford.edu',
        qsRanking: 3,
        type: 'research',
        emailDomains: ['stanford.edu'],
        status: 'active',
      },
    }),
    prisma.university.upsert({
      where: { rorId: 'https://ror.org/052gg0110' },
      update: {},
      create: {
        rorId: 'https://ror.org/052gg0110',
        name: 'University of Cambridge',
        countryId: countries[1].id,
        city: 'Cambridge',
        websiteUrl: 'https://www.cam.ac.uk',
        qsRanking: 2,
        type: 'research',
        emailDomains: ['cam.ac.uk'],
        status: 'active',
      },
    }),
  ]);

  // Research Areas
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

  // Sample Departments
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

  // Sample Professors
  const prof1 = await prisma.professor.upsert({
    where: { openalexId: 'A5023888391' },
    update: {},
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
      dataSource: 'manual',
    },
  });

  await prisma.professorResearchArea.upsert({
    where: { professorId_researchAreaId: { professorId: prof1.id, researchAreaId: researchAreas[1].id } },
    update: {},
    create: { professorId: prof1.id, researchAreaId: researchAreas[1].id, score: 0.95, isPrimary: true },
  });

  await prisma.professorEmail.upsert({
    where: { professorId_email: { professorId: prof1.id, email: 'schen@mit.edu' } },
    update: {},
    create: {
      professorId: prof1.id,
      email: 'schen@mit.edu',
      type: 'institutional',
      isPrimary: true,
      isVerified: true,
      verificationStatus: 'verified',
      verificationSource: 'manual_review',
      domainMatch: true,
      mxValid: true,
      verifiedAt: new Date(),
    },
  });

  // Sample Scholarship
  await prisma.scholarship.upsert({
    where: { slug: 'fulbright-student-program-2025' },
    update: {},
    create: {
      title: 'Fulbright Student Program 2025',
      slug: 'fulbright-student-program-2025',
      description: 'The Fulbright Program offers grants for individually designed study/research projects or for English Teaching Assistant Programs.',
      countryId: countries[0].id,
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

  console.log('✅ Seed complete!');
  console.log(`   Admin: admin@profcrm.com / Admin@123456`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
