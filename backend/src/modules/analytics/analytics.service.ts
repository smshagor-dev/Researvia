import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformStats() {
    const [users, professors, scholarships, activeSubscriptions] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.professor.count({ where: { status: 'active' } }),
      this.prisma.scholarship.count({ where: { isActive: true } }),
      this.prisma.subscription.count({ where: { status: 'active' } }),
    ]);
    return { users, professors, scholarships, activeSubscriptions };
  }

  async getUserGrowth(days = 30) {
    const since = new Date(Date.now() - days * 86400000);
    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: since }, deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    // Group by date
    const grouped: Record<string, number> = {};
    for (const u of users) {
      const date = u.createdAt.toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + 1;
    }
    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  }

  async getEmailStats(userId: string) {
    const [total, sent, opened, replied, bounced] = await Promise.all([
      this.prisma.emailMessage.count({ where: { userId, direction: 'outbound' } }),
      this.prisma.emailMessage.count({ where: { userId, direction: 'outbound', status: { in: ['sent','delivered','opened','replied'] } } }),
      this.prisma.emailMessage.count({ where: { userId, direction: 'outbound', openCount: { gt: 0 } } }),
      this.prisma.emailMessage.count({ where: { userId, direction: 'outbound', repliedAt: { not: null } } }),
      this.prisma.emailMessage.count({ where: { userId, direction: 'outbound', status: 'bounced' } }),
    ]);
    return { total, sent, opened, replied, bounced,
      openRate: sent > 0 ? Math.round((opened/sent)*100) : 0,
      replyRate: sent > 0 ? Math.round((replied/sent)*100) : 0,
    };
  }

  async getTopUniversities(limit = 10) {
    const result = await this.prisma.professor.groupBy({
      by: ['universityId'],
      _count: { id: true },
      where: { status: 'active' },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });
    const ids = result.map(r => r.universityId);
    const universities = await this.prisma.university.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, logoUrl: true },
    });
    return result.map(r => ({
      university: universities.find(u => u.id === r.universityId),
      professorCount: r._count.id,
    }));
  }
}
