export type FacultyPageCategory = 'faculty_page' | 'department_page' | 'lab_page' | 'directory_page';

export interface FacultyDiscoveryJobData {
  professorId: string;
  requestedBy?: string;
  trigger?: 'admin' | 'system';
}

export interface FacultyScrapeJobData {
  professorId: string;
  facultyPageUrl: string;
  sourceType: FacultyPageCategory;
  requestedBy?: string;
}

export interface FacultyEmailExtractionJobData {
  professorId: string;
  facultyPageUrl: string;
  sourceType: FacultyPageCategory;
  html: string;
}

export interface EmailValidationJobData {
  professorId: string;
  email: string;
  sourceUrl: string;
  sourceType: FacultyPageCategory;
  pageText?: string;
}

