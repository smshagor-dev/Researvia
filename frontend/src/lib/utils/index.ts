import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', ...opts,
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return formatDate(date);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function formatDeadline(deadline: string | Date | null): { text: string; color: string } {
  if (!deadline) return { text: 'No deadline', color: 'text-muted-foreground' };
  const d = new Date(deadline);
  const now = new Date();
  const daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86400000);

  if (daysLeft < 0) return { text: 'Expired', color: 'text-muted-foreground line-through' };
  if (daysLeft === 0) return { text: 'Today!', color: 'text-red-600 font-bold' };
  if (daysLeft <= 14) return { text: `${daysLeft}d left`, color: 'text-red-500 font-semibold' };
  if (daysLeft <= 60) return { text: `${daysLeft}d left`, color: 'text-orange-500' };
  return { text: formatDate(deadline), color: 'text-green-600' };
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatCredits(n: number): string {
  return n.toLocaleString();
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return filtered.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

export const FUNDING_TYPE_LABELS: Record<string, string> = {
  fully_funded: 'Fully Funded',
  partially_funded: 'Partially Funded',
  stipend_only: 'Stipend Only',
  tuition_only: 'Tuition Only',
  other: 'Other',
};

export const DEGREE_LEVEL_LABELS: Record<string, string> = {
  bachelors: "Bachelor's",
  masters: "Master's",
  phd: 'PhD',
  postdoc: 'Postdoc',
  other: 'Other',
};

export const POSITION_LABELS: Record<string, string> = {
  professor: 'Professor',
  associate_professor: 'Associate Professor',
  assistant_professor: 'Assistant Professor',
  lecturer: 'Lecturer',
  researcher: 'Researcher',
  postdoc: 'Postdoc',
  emeritus: 'Professor Emeritus',
  adjunct: 'Adjunct Professor',
};

export const ACCEPTING_LABELS: Record<string, { label: string; color: string }> = {
  yes: { label: 'Accepting Students', color: 'text-green-600 bg-green-50 border-green-200' },
  no: { label: 'Not Accepting', color: 'text-red-600 bg-red-50 border-red-200' },
  unknown: { label: 'Unknown', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
};
