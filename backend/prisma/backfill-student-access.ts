import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function encrypt(text: string) {
  const keyHex = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
  const key = Buffer.from(keyHex.padEnd(64, '0').slice(0, 64), 'hex');
  const normalizedKey = key.length === 32 ? key : crypto.createHash('sha256').update(keyHex).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', normalizedKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

function randomToken(bytes = 18) {
  return crypto.randomBytes(bytes).toString('hex');
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 48);
}

async function generateMailboxEmail(fullName: string, email: string, domain: string) {
  const base = slugify(fullName || email) || `user${Date.now()}`;

  for (let i = 0; i < 50; i += 1) {
    const localPart = i === 0 ? base : `${base}${i + 1}`;
    const candidate = `${localPart}@${domain}`;
    const exists = await prisma.emailAccount.findFirst({
      where: { email: candidate },
      select: { id: true },
    });

    if (!exists) {
      return candidate;
    }
  }

  return `${base}.${randomToken(3)}@${domain}`;
}

async function main() {
  console.log('Backfilling student access...');

  const settings = await prisma.mailSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      systemMailDomain: 'researvia.com',
      systemSmtpHost: 'mail.researvia.com',
      systemSmtpPort: 465,
      systemImapHost: 'mail.researvia.com',
      systemImapPort: 993,
      systemMailboxQuotaMb: 1024,
      trackingBaseUrl: 'http://localhost:3001',
    },
  });

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { role: 'user' },
        { studentProfile: { isNot: null } },
      ],
    },
    include: {
      studentProfile: { select: { id: true } },
      emailAccounts: {
        where: { type: 'SYSTEM' },
        select: { id: true },
      },
    },
  });

  let createdProfiles = 0;
  let createdMailboxes = 0;

  for (const user of users) {
    if (!user.studentProfile) {
      await prisma.studentProfile.create({
        data: {
          userId: user.id,
          fullName: user.fullName || user.email,
          nationality: 'Unknown',
          currentCountry: 'Unknown',
          onboardingCompleted: false,
          onboardingStep: 1,
          profileCompleteness: 0,
        },
      });
      createdProfiles += 1;
    }

    if (user.emailAccounts.length === 0) {
      const mailboxEmail = await generateMailboxEmail(user.fullName, user.email, settings.systemMailDomain);
      const password = `${randomToken(18)}Aa1!`;

      await prisma.emailAccount.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          provider: 'SYSTEM',
          label: 'System Mailbox',
          email: mailboxEmail,
          smtpHost: settings.systemSmtpHost,
          smtpPort: settings.systemSmtpPort,
          smtpSecure: true,
          smtpUsername: mailboxEmail,
          encryptedSmtpPassword: encrypt(password),
          imapHost: settings.systemImapHost,
          imapPort: settings.systemImapPort,
          imapSecure: true,
          imapUsername: mailboxEmail,
          encryptedImapPassword: encrypt(password),
          isSystemManaged: true,
          isEditable: false,
          mailboxStatus: 'pending',
          isDefault: true,
          isActive: false,
        },
      });
      createdMailboxes += 1;
    }
  }

  console.log(`Created student profiles: ${createdProfiles}`);
  console.log(`Created system mailboxes: ${createdMailboxes}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
