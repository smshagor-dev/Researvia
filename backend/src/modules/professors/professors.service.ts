import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { PaginationService } from '../../shared/pagination/pagination.service';

export interface ProfessorFilters {
  q?: string;
  universityId?: string;
  departmentId?: string;
  countryId?: string;
  researchAreaId?: string;
  acceptingStudents?: string;
  fundingStatus?: string;
  position?: string;
  minHIndex?: number;
  maxHIndex?: number;
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: string;
}

@Injectable()
export class ProfessorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly pagination: PaginationService,
  ) {}

  async findAll(filters: ProfessorFilters, userId?: string) {
    const page = this.pagination.clampPage(filters.page || 1);
    const perPage = this.pagination.clampPerPage(filters.perPage || 20);
    const skip = this.pagination.getSkip(page, perPage);

    const where: any = { status: 'active' };

    if (filters.q) {
      where.OR = [
        { fullName: { contains: filters.q } },
        { bio: { contains: filters.q } },
      ];
    }
    if (filters.universityId) where.universityId = filters.universityId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.acceptingStudents) where.acceptingStudents = filters.acceptingStudents;
    if (filters.fundingStatus) where.fundingStatus = filters.fundingStatus;
    if (filters.position) where.position = filters.position;
    if (filters.minHIndex || filters.maxHIndex) {
      where.hIndex = {};
      if (filters.minHIndex) where.hIndex.gte = Number(filters.minHIndex);
      if (filters.maxHIndex) where.hIndex.lte = Number(filters.maxHIndex);
    }
    if (filters.countryId) {
      where.university = { countryId: filters.countryId };
    }
    if (filters.researchAreaId) {
      where.researchAreas = { some: { researchAreaId: filters.researchAreaId } };
    }

    const orderBy = this.buildOrderBy(filters.sortBy, filters.sortOrder);

    const [professors, total] = await Promise.all([
      this.prisma.professor.findMany({
        where,
        skip,
        take: perPage,
        orderBy,
        include: {
          university: { select: { id: true, name: true, logoUrl: true, country: { select: { name: true, isoAlpha2: true, flagEmoji: true } } } },
          department: { select: { id: true, name: true } },
          researchAreas: {
            take: 5,
            include: { researchArea: { select: { id: true, name: true, slug: true } } },
            orderBy: { score: 'desc' },
          },
          _count: { select: { emails: { where: { isVerified: true } } } },
        },
      }),
      this.prisma.professor.count({ where }),
    ]);

    const data = professors.map((p) => this.formatProfessorList(p));
    return this.pagination.paginate(data, total, page, perPage);
  }

  async findOne(id: string) {
    const professor = await this.prisma.professor.findFirst({
      where: { id, status: 'active' },
      include: {
        university: { include: { country: true } },
        department: true,
        researchAreas: {
          include: { researchArea: true },
          orderBy: [{ isPrimary: 'desc' }, { score: 'desc' }],
        },
        publications: {
          orderBy: [{ citationCount: 'desc' }, { publicationYear: 'desc' }],
          take: 20,
        },
        _count: { select: { emails: { where: { isVerified: true } } } },
      },
    });
    if (!professor) throw new NotFoundException('Professor not found');
    return professor;
  }

  async revealEmail(professorId: string, userId: string) {
    const emails = await this.prisma.professorEmail.findMany({
      where: { professorId, isVerified: true },
      select: { email: true, type: true, isPrimary: true },
      orderBy: { isPrimary: 'desc' },
    });
    if (!emails.length) {
      return { emails: [], message: 'No verified emails available for this professor' };
    }
    return { emails };
  }

  async getSimilarProfessors(professorId: string, limit = 3) {
    const prof = await this.prisma.professor.findFirst({
      where: { id: professorId },
      include: { researchAreas: { take: 3, select: { researchAreaId: true } } },
    });
    if (!prof) return [];

    const areaIds = prof.researchAreas.map((r) => r.researchAreaId);
    const similar = await this.prisma.professor.findMany({
      where: {
        id: { not: professorId },
        status: 'active',
        researchAreas: { some: { researchAreaId: { in: areaIds } } },
      },
      take: limit,
      include: {
        university: { select: { name: true, logoUrl: true } },
        researchAreas: {
          take: 3,
          include: { researchArea: { select: { name: true } } },
        },
      },
    });
    return similar;
  }

  async create(data: any) {
    return this.prisma.professor.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.professor.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.professor.update({ where: { id }, data: { status: 'inactive' } });
    return { success: true };
  }

  async getStats() {
    const [total, withVerifiedEmail, accepting] = await Promise.all([
      this.prisma.professor.count({ where: { status: 'active' } }),
      this.prisma.professor.count({
        where: { status: 'active', emails: { some: { isVerified: true } } },
      }),
      this.prisma.professor.count({ where: { status: 'active', acceptingStudents: 'yes' } }),
    ]);
    return { total, withVerifiedEmail, accepting };
  }

  private buildOrderBy(sortBy?: string, sortOrder?: string) {
    const order = (sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';
    switch (sortBy) {
      case 'hIndex': return { hIndex: order };
      case 'citations': return { citationsCount: order };
      case 'name': return { fullName: order };
      default: return { hIndex: 'desc' as const };
    }
  }

  private formatProfessorList(p: any) {
    return {
      id: p.id,
      fullName: p.fullName,
      title: p.title,
      position: p.position,
      avatarUrl: p.avatarUrl,
      hIndex: p.hIndex,
      citationsCount: p.citationsCount,
      publicationsCount: p.publicationsCount,
      acceptingStudents: p.acceptingStudents,
      fundingStatus: p.fundingStatus,
      university: p.university,
      department: p.department,
      researchAreas: p.researchAreas?.map((r: any) => ({
        id: r.researchArea.id,
        name: r.researchArea.name,
        slug: r.researchArea.slug,
        score: r.score,
        isPrimary: r.isPrimary,
      })),
      hasVerifiedEmail: p._count?.emails > 0,
    };
  }
}
