import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaginationService } from '../../shared/pagination/pagination.service';

@Injectable()
export class UniversitiesService {
  constructor(private readonly prisma: PrismaService, private readonly pagination: PaginationService) {}

  async findAll(filters: any) {
    const page = this.pagination.clampPage(filters.page || 1);
    const perPage = this.pagination.clampPerPage(filters.perPage || 20);
    const where: any = { status: 'active' };
    if (filters.q) where.name = { contains: filters.q };
    if (filters.countryId) where.countryId = filters.countryId;
    if (filters.type) where.type = filters.type;
    const [universities, total] = await Promise.all([
      this.prisma.university.findMany({ where, skip: (page-1)*perPage, take: perPage, include: { country: { select: { name: true, flagEmoji: true, isoAlpha2: true } } }, orderBy: { name: 'asc' } }),
      this.prisma.university.count({ where }),
    ]);
    return this.pagination.paginate(universities, total, page, perPage);
  }

  async findOne(id: string) {
    const u = await this.prisma.university.findUnique({
      where: { id },
      include: { country: true, departments: true, _count: { select: { professors: true } } },
    });
    if (!u) throw new NotFoundException('University not found');
    return u;
  }

  async create(data: any) { return this.prisma.university.create({ data }); }
  async update(id: string, data: any) { return this.prisma.university.update({ where: { id }, data }); }
  async delete(id: string) { return this.prisma.university.update({ where: { id }, data: { status: 'inactive' } }); }

  async getCountries() {
    return this.prisma.country.findMany({ orderBy: { name: 'asc' } });
  }
}
