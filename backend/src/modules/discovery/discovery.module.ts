import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscoveryService } from './discovery.service';
import { OpenAlexAdapter } from './adapters/openalex.adapter';
import { OrcidAdapter } from './adapters/orcid.adapter';
import { CrossrefAdapter } from './adapters/crossref.adapter';
import { RorAdapter } from './adapters/ror.adapter';
import { ACADEMIC_SOURCE_ADAPTERS } from './discovery.constants';
import { QueuesModule } from '../../queues/queues.module';
import { SyncLogsModule } from '../sync-logs/sync-logs.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [ConfigModule, QueuesModule, SyncLogsModule, SystemSettingsModule],
  providers: [
    DiscoveryService,
    OpenAlexAdapter,
    OrcidAdapter,
    CrossrefAdapter,
    RorAdapter,
    {
      provide: ACADEMIC_SOURCE_ADAPTERS,
      useFactory: (
        openAlex: OpenAlexAdapter,
        orcid: OrcidAdapter,
        crossref: CrossrefAdapter,
        ror: RorAdapter,
      ) => [openAlex, orcid, crossref, ror],
      inject: [OpenAlexAdapter, OrcidAdapter, CrossrefAdapter, RorAdapter],
    },
  ],
  exports: [DiscoveryService, ACADEMIC_SOURCE_ADAPTERS],
})
export class DiscoveryModule {}
