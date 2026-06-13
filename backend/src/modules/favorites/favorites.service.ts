import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaginationService } from '../../shared/pagination/pagination.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService, private readonly pagination: PaginationService) {}

  async save(userId: string, professorId: string, note?: string) {
    return this.prisma.favorite.upsert({
      where: { userId_professorId: { userId, professorId } },
      update: { note },
      create: { userId, professorId, note, status: 'saved' },
    });
  }

  async remove(userId: string, professorId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, professorId } });
    return { success: true };
  }

  async findAll(userId: string, page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const [favorites, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId }, skip, take: perPage,
        include: {
          professor: {
            include: {
              university: { select: { name: true, logoUrl: true, country: { select: { name: true, flagEmoji: true } } } },
              researchAreas: { take: 3, include: { researchArea: { select: { name: true } } } },
              _count: { select: { emails: { where: { isVerified: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);
    return { data: favorites, meta: { page, perPage, total } };
  }

  async updateStatus(userId: string, professorId: string, status: string, note?: string) {
    return this.prisma.favorite.updateMany({
      where: { userId, professorId },
      data: { status: status as any, note },
    });
  }

  async checkSaved(userId: string, professorId: string) {
    const fav = await this.prisma.favorite.findUnique({
      where: { userId_professorId: { userId, professorId } },
    });
    return { saved: !!fav, status: fav?.status };
  }
}
