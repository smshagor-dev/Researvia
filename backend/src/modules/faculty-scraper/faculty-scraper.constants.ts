export const FACULTY_DISCOVERY_QUEUE = 'faculty-discovery';
export const FACULTY_SCRAPE_QUEUE = 'faculty-scrape';
export const FACULTY_EMAIL_EXTRACTION_QUEUE = 'faculty-email-extraction';
export const EMAIL_VALIDATION_QUEUE = 'email-validation';

export const FACULTY_DISCOVERY_JOB = 'discover-faculty-page';
export const FACULTY_SCRAPE_JOB = 'scrape-faculty-page';
export const FACULTY_EMAIL_EXTRACTION_JOB = 'extract-faculty-emails';
export const EMAIL_VALIDATION_JOB = 'validate-professor-email';

export const FACULTY_SCRAPER_QUEUE_NAMES = [
  FACULTY_DISCOVERY_QUEUE,
  FACULTY_SCRAPE_QUEUE,
  FACULTY_EMAIL_EXTRACTION_QUEUE,
  EMAIL_VALIDATION_QUEUE,
] as const;

