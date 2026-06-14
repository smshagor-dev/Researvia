import { ConfigService } from '@nestjs/config';
import { ScholarshipSourceType } from '@prisma/client';
import { HttpScholarshipAdapter } from './http-scholarship.adapter';

export class DAADAdapter extends HttpScholarshipAdapter {
  readonly sourceType = ScholarshipSourceType.daad;
  readonly sourceName = 'DAAD';
  protected readonly configKey = 'DAAD_API_URL';

  constructor(config: ConfigService) {
    super(config);
  }
}
