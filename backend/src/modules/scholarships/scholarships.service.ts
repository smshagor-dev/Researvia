import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { RedisService } from '../../shared/redis/redis.service';

@Injectable()
export class ScholarshipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
    private readonly redis: RedisService,
  ) {}

  async findAll(filters: any) {
    const page = this.pagination.clampPage(filters.page || 1);
    const perPage = this.pagination.clampPerPage(filters.perPage || 20);
    const skip = this.pagination.getSkip(page, perPage);

    const where: any = {};
    if (filters.isActive !== 'false') where.isActive = true;
    if (filters.isExpired !== 'true') where.isExpired = false;
    if (filters.q) where.title = { contains: filters.q };
    if (filters.countryId) where.countryId = filters.countryId;
    if (filters.universityId) where.universityId = filters.universityId;
    if (filters.fundingType) where.fundingType = filters.fundingType;
    if (filters.degreeLevel) where.degreeLevels = { path: '$', array_contains: filters.degreeLevel };
    if (filters.deadlineFrom || filters.deadlineTo) {
      where.deadline = {};
      if (filters.deadlineFrom) where.deadline.gte = new Date(filters.deadlineFrom);
      if (filters.deadlineTo) where.deadline.lte = new Date(filters.deadlineTo);
    }

    const orderMap: any = {
      deadline: { deadline: 'asc' },
      title: { title: 'asc' },
      createdAt: { createdAt: 'desc' },
    };
    const orderBy = orderMap[filters.sortBy] || { createdAt: 'desc' };

    const [scholarships, total] = await Promise.all([
      this.prisma.scholarship.findMany({
        where, skip, take: perPage, orderBy,
        include: {
          country: { select: { name: true, isoAlpha2: true, flagEmoji: true } },
          university: { select: { id: true, name: true, logoUrl: true } },
        },
      }),
      this.prisma.scholarship.count({ where }),
    ]);

    return this.pagination.paginate(scholarships, total, page, perPage);
  }

  async findOne(id: string) {
    const s = await this.prisma.scholarship.findUnique({
      where: { id },
      include: {
        country: true,
        university: { include: { country: true } },
      },
    });
    if (!s) throw new NotFoundException('Scholarship not found');
    await this.prisma.scholarship.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return s;
  }

  async create(data: any) {
    const slug = await this.generateSlug(data.title);
    return this.prisma.scholarship.create({ data: { ...data, slug } });
  }

  async update(id: string, data: any) {
    return this.prisma.scholarship.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.scholarship.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  }

  async save(userId: string, scholarshipId: string, data: any = {}) {
    const saved = await this.prisma.savedScholarship.upsert({
      where: { userId_scholarshipId: { userId, scholarshipId } },
      update: data,
      create: { userId, scholarshipId, ...data },
    });
    await this.prisma.scholarship.update({ where: { id: scholarshipId }, data: { saveCount: { increment: 1 } } });
    return saved;
  }

  async unsave(userId: string, scholarshipId: string) {
    await this.prisma.savedScholarship.deleteMany({ where: { userId, scholarshipId } });
    return { success: true };
  }

  async getSaved(userId: string, page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const [items, total] = await Promise.all([
      this.prisma.savedScholarship.findMany({
        where: { userId },
        skip, take: perPage,
        include: {
          scholarship: {
            include: {
              country: { select: { name: true, flagEmoji: true } },
              university: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.savedScholarship.count({ where: { userId } }),
    ]);
    return { data: items, meta: { page, perPage, total } };
  }

  async updateSavedStatus(userId: string, scholarshipId: string, data: any) {
    return this.prisma.savedScholarship.updateMany({
      where: { userId, scholarshipId },
      data,
    });
  }

  async markExpired() {
    const result = await this.prisma.scholarship.updateMany({
      where: { deadline: { lt: new Date() }, isExpired: false },
      data: { isExpired: true, isActive: false },
    });
    return result.count;
  }

  private async generateSlug(title: string): Promise<string> {
    let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existing = await this.prisma.scholarship.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;
    return slug;
  }
}
