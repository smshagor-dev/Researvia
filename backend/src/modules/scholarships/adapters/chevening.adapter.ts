import { ConfigService } from '@nestjs/config';
import { ScholarshipSourceType } from '@prisma/client';
import { HttpScholarshipAdapter } from './http-scholarship.adapter';

export class CheveningAdapter extends HttpScholarshipAdapter {
  readonly sourceType = ScholarshipSourceType.chevening;
  readonly sourceName = 'Chevening';
  protected readonly configKey = 'CHEVENING_API_URL';

  constructor(config: ConfigService) {
    super(config);
  }
}
