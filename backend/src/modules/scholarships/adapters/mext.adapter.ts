import { ConfigService } from '@nestjs/config';
import { ScholarshipSourceType } from '@prisma/client';
import { HttpScholarshipAdapter } from './http-scholarship.adapter';
import { SystemSettingsService } from '../../system-settings/system-settings.service';

export class MEXTAdapter extends HttpScholarshipAdapter {
  readonly sourceType = ScholarshipSourceType.mext;
  readonly sourceName = 'MEXT';
  protected readonly configKey = 'MEXT_API_URL';

  constructor(config: ConfigService, systemSettings: SystemSettingsService) {
    super(config, systemSettings);
  }
}
