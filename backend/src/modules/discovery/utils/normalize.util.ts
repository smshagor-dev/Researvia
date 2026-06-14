export function normalizeName(value: string | null | undefined) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

export function slugify(value: string) {
  return normalizeName(value).replace(/\s+/g, '-');
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

