export type AnalyzeStudentProfileJobData = {
  userId: string;
  source?: 'manual' | 'cv-parse' | 'profile-update' | 'system';
};

export type CalculateProfessorMatchJobData = {
  userId: string;
  professorId: string;
  force?: boolean;
};

export type CalculateScholarshipMatchJobData = {
  userId: string;
  scholarshipId: string;
  force?: boolean;
};

export type RefreshUserMatchesJobData = {
  userId: string;
  force?: boolean;
  targetType?: 'all' | 'professor' | 'scholarship';
};
