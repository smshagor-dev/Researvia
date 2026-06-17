import { ConfigService } from '@nestjs/config';
import { ScholarshipSourceType } from '@prisma/client';
import { HttpScholarshipAdapter } from './http-scholarship.adapter';
import { SystemSettingsService } from '../../system-settings/system-settings.service';

export class ErasmusAdapter extends HttpScholarshipAdapter {
  readonly sourceType = ScholarshipSourceType.erasmus;
  readonly sourceName = 'Erasmus';
  protected readonly configKey = 'ERASMUS_API_URL';

  constructor(config: ConfigService, systemSettings: SystemSettingsService) {
    super(config, systemSettings);
  }
}
