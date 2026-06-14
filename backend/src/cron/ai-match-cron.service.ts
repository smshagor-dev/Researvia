import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MatchEngineService } from '../modules/ai/match-engine.service';
import { PrismaService } from '../shared/prisma/prisma.service';

@Injectable()
export class AiMatchCronService {
  private readonly logger = new Logger(AiMatchCronService.name);

  constructor(
    private readonly matches: MatchEngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(process.env.AI_MATCH_REFRESH_DAILY_CRON || '30 2 * * *')
  async refreshRecentStudentMatches() {
    const users = await this.prisma.user.findMany({
      where: { role: 'user', deletedAt: null },
      select: { id: true },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });

    let queued = 0;
    for (const user of users) {
      await this.matches.requestRefresh(user.id, { force: false, targetType: 'all' });
      queued += 1;
    }

    this.logger.log(`Queued AI match refresh for ${queued} users`);
  }
}
