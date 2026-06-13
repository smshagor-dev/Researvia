import { Module } from '@nestjs/common';
import { EmailRealtimeGateway } from './email-realtime.gateway';

@Module({
  providers: [EmailRealtimeGateway],
  exports: [EmailRealtimeGateway],
})
export class EmailRealtimeModule {}
