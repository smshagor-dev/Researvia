import { ConfigService } from '@nestjs/config';
import { ScholarshipSourceType } from '@prisma/client';
import { HttpScholarshipAdapter } from './http-scholarship.adapter';

export class CommonwealthAdapter extends HttpScholarshipAdapter {
  readonly sourceType = ScholarshipSourceType.commonwealth;
  readonly sourceName = 'Commonwealth';
  protected readonly configKey = 'COMMONWEALTH_API_URL';

  constructor(config: ConfigService) {
    super(config);
  }
}
