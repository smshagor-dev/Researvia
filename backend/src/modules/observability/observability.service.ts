import { Injectable } from '@nestjs/common';
import { getMetricsRegistry } from './metrics.registry';

@Injectable()
export class ObservabilityService {
  async getMetricsText() {
    return getMetricsRegistry().metrics();
  }

  async getContentType() {
    return getMetricsRegistry().contentType;
  }
}
