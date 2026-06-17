import { ConfigService } from '@nestjs/config';
import { ScholarshipSourceType } from '@prisma/client';
import { HttpScholarshipAdapter } from './http-scholarship.adapter';
import { SystemSettingsService } from '../../system-settings/system-settings.service';

export class DAADAdapter extends HttpScholarshipAdapter {
  readonly sourceType = ScholarshipSourceType.daad;
  readonly sourceName = 'DAAD';
  protected readonly configKey = 'DAAD_API_URL';

  constructor(config: ConfigService, systemSettings: SystemSettingsService) {
    super(config, systemSettings);
  }
}
