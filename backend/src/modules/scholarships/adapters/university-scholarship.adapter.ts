import { ConfigService } from '@nestjs/config';
import { ScholarshipSourceType } from '@prisma/client';
import { HttpScholarshipAdapter } from './http-scholarship.adapter';

export class UniversityScholarshipAdapter extends HttpScholarshipAdapter {
  readonly sourceType = ScholarshipSourceType.university;
  readonly sourceName = 'UniversityScholarship';
  protected readonly configKey = 'UNIVERSITY_SCHOLARSHIP_API_URL';

  constructor(config: ConfigService) {
    super(config);
  }
}
