import { ConfigService } from '@nestjs/config';
import { ScholarshipSourceType } from '@prisma/client';
import { HttpScholarshipAdapter } from './http-scholarship.adapter';

export class MEXTAdapter extends HttpScholarshipAdapter {
  readonly sourceType = ScholarshipSourceType.mext;
  readonly sourceName = 'MEXT';
  protected readonly configKey = 'MEXT_API_URL';

  constructor(config: ConfigService) {
    super(config);
  }
}
