import { createHash } from 'crypto';

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase().replace(/^mailto:/, '');
}

export function hashEmail(email: string) {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex');
}

export function deobfuscateEmails(input: string) {
  return input
    .replace(/\s*\[\s*at\s*\]\s*/gi, '@')
    .replace(/\s*\(\s*at\s*\)\s*/gi, '@')
    .replace(/\s+at\s+/gi, '@')
    .replace(/\s*\[\s*dot\s*\]\s*/gi, '.')
    .replace(/\s*\(\s*dot\s*\)\s*/gi, '.')
    .replace(/\s+dot\s+/gi, '.');
}

export function extractEmailsFromHtml(html: string) {
  const normalized = deobfuscateEmails(html);
  const matches = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return [...new Set(matches.map(normalizeEmail))];
}

export function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

