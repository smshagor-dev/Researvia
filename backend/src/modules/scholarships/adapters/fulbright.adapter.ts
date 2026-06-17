import { ConfigService } from '@nestjs/config';
import { ScholarshipSourceType } from '@prisma/client';
import { HttpScholarshipAdapter } from './http-scholarship.adapter';
import { SystemSettingsService } from '../../system-settings/system-settings.service';

export class FulbrightAdapter extends HttpScholarshipAdapter {
  readonly sourceType = ScholarshipSourceType.fulbright;
  readonly sourceName = 'Fulbright';
  protected readonly configKey = 'FULBRIGHT_API_URL';

  constructor(config: ConfigService, systemSettings: SystemSettingsService) {
    super(config, systemSettings);
  }
}
