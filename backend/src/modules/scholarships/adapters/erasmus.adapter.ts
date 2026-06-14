import { ConfigService } from '@nestjs/config';
import { ScholarshipSourceType } from '@prisma/client';
import { HttpScholarshipAdapter } from './http-scholarship.adapter';

export class ErasmusAdapter extends HttpScholarshipAdapter {
  readonly sourceType = ScholarshipSourceType.erasmus;
  readonly sourceName = 'Erasmus';
  protected readonly configKey = 'ERASMUS_API_URL';

  constructor(config: ConfigService) {
    super(config);
  }
}
