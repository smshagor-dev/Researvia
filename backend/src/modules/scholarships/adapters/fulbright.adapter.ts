import { ConfigService } from '@nestjs/config';
import { ScholarshipSourceType } from '@prisma/client';
import { HttpScholarshipAdapter } from './http-scholarship.adapter';

export class FulbrightAdapter extends HttpScholarshipAdapter {
  readonly sourceType = ScholarshipSourceType.fulbright;
  readonly sourceName = 'Fulbright';
  protected readonly configKey = 'FULBRIGHT_API_URL';

  constructor(config: ConfigService) {
    super(config);
  }
}
