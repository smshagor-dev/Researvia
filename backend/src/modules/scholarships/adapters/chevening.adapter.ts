import { ConfigService } from '@nestjs/config';
import { ScholarshipSourceType } from '@prisma/client';
import { HttpScholarshipAdapter } from './http-scholarship.adapter';
import { SystemSettingsService } from '../../system-settings/system-settings.service';

export class CheveningAdapter extends HttpScholarshipAdapter {
  readonly sourceType = ScholarshipSourceType.chevening;
  readonly sourceName = 'Chevening';
  protected readonly configKey = 'CHEVENING_API_URL';

  constructor(config: ConfigService, systemSettings: SystemSettingsService) {
    super(config, systemSettings);
  }
}
