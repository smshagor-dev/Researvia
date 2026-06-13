import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: {
    type: string; title: string; body?: string;
    actionUrl?: string; channel?: any; data?: any;
  }) {
    return this.prisma.notification.create({
      data: { userId, channel: 'in_app', ...data },
    });
  }

  async createBulk(userIds: string[], data: any) {
    return this.prisma.notification.createMany({
      data: userIds.map(userId => ({ userId, channel: 'in_app', ...data })),
    });
  }
}
