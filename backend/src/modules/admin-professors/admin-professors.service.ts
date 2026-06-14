import { Injectable, NotFoundException } from '@nestjs/common';
import { AcceptingStudents, DataSource, Prisma, ProfessorPosition, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { AdminService } from '../admin/admin.service';
import { AdminProfessorFilterDto, AdminProfessorUpdateDto } from './dto/admin-professor.dto';
import { ProfessorSyncAdminService } from '../professor-sync/professor-sync-admin.service';

@Injectable()
export class AdminProfessorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
    private readonly adminService: AdminService,
    private readonly professorSyncAdmin: ProfessorSyncAdminService,
  ) {}

  async list(filters: AdminProfessorFilterDto) {
    const page = this.pagination.clampPage(filters.page ?? 1);
    const pageSize = this.pagination.clampPerPage(filters.pageSize ?? 25, 100);
    const skip = this.pagination.getSkip(page, pageSize);
    const where = this.buildWhere(filters);
    const orderBy = this.buildOrderBy(filters.sortBy, filters.sortOrder);

    const [professors, totalRecords] = await Promise.all([
      this.prisma.professor.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          fullName: true,
          verificationStatus: true,
          isPublic: true,
          sourceType: true,
          dataQualityScore: true,
          lastSyncedAt: true,
          createdAt: true,
          university: {
            select: {
              name: true,
              country: { select: { name: true } },
            },
          },
          department: { select: { name: true } },
          researchAreas: {
            orderBy: [{ isPrimary: 'desc' }, { score: 'desc' }],
            take: 5,
            select: { researchArea: { select: { name: true } } },
          },
          _count: {
            select: {
              emails: { where: { isVerified: true } },
            },
          },
        },
      }),
      this.prisma.professor.count({ where }),
    ]);

    const totalPages = Math.ceil(totalRecords / pageSize) || 1;

    return {
      data: professors.map((professor) => ({
        id: professor.id,
        name: professor.fullName,
        university: professor.university?.name ?? null,
        country: professor.university?.country?.name ?? null,
        department: professor.department?.name ?? null,
        researchAreas: professor.researchAreas.map((item) => item.researchArea.name),
        verifiedEmailCount: professor._count.emails,
        verificationStatus: professor.verificationStatus,
        isPublic: professor.isPublic,
        sourceType: professor.sourceType,
        dataQualityScore: professor.dataQualityScore,
        lastSyncedAt: professor.lastSyncedAt,
        createdAt: professor.createdAt,
      })),
      meta: {
        totalRecords,
        totalPages,
        currentPage: page,
        pageSize,
      },
    };
  }

  async get(id: string) {
    const professor = await this.prisma.professor.findUnique({
      where: { id },
      select: {
        id: true,
        universityId: true,
        departmentId: true,
        fullName: true,
        firstName: true,
        lastName: true,
        title: true,
        position: true,
        bio: true,
        acceptingStudents: true,
        verificationStatus: true,
        isPublic: true,
        sourceType: true,
        dataQualityScore: true,
        lastSyncedAt: true,
        lastVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        university: {
          select: {
            name: true,
            country: { select: { name: true } },
          },
        },
        department: { select: { name: true } },
        researchAreas: {
          orderBy: [{ isPrimary: 'desc' }, { score: 'desc' }],
          take: 10,
          select: { researchArea: { select: { name: true } } },
        },
        emails: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            email: true,
            isPrimary: true,
            isVerified: true,
            verificationStatus: true,
            verifiedAt: true,
          },
        },
        _count: {
          select: {
            emails: { where: { isVerified: true } },
          },
        },
      },
    });

    if (!professor) {
      throw new NotFoundException('Professor not found');
    }

    return {
      id: professor.id,
      name: professor.fullName,
      fullName: professor.fullName,
      firstName: professor.firstName,
      lastName: professor.lastName,
      title: professor.title,
      position: professor.position,
      bio: professor.bio,
      universityId: professor.universityId,
      university: professor.university?.name ?? null,
      country: professor.university?.country?.name ?? null,
      departmentId: professor.departmentId,
      department: professor.department?.name ?? null,
      researchAreas: professor.researchAreas.map((item) => item.researchArea.name),
      verifiedEmailCount: professor._count.emails,
      verificationStatus: professor.verificationStatus,
      acceptingStudents: professor.acceptingStudents,
      isPublic: professor.isPublic,
      sourceType: professor.sourceType,
      dataQualityScore: professor.dataQualityScore,
      lastSyncedAt: professor.lastSyncedAt,
      lastVerifiedAt: professor.lastVerifiedAt,
      createdAt: professor.createdAt,
      updatedAt: professor.updatedAt,
      emails: professor.emails,
    };
  }

  async update(id: string, dto: AdminProfessorUpdateDto, adminId: string) {
    const existing = await this.prisma.professor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Professor not found');
    }

    const data: Prisma.ProfessorUpdateInput = {
      university: dto.universityId ? { connect: { id: dto.universityId } } : undefined,
      department: dto.departmentId === null
        ? { disconnect: true }
        : dto.departmentId
          ? { connect: { id: dto.departmentId } }
          : undefined,
      fullName: dto.fullName,
      firstName: dto.firstName,
      lastName: dto.lastName,
      title: dto.title,
      position: dto.position as ProfessorPosition | undefined,
      bio: dto.bio,
      acceptingStudents: dto.acceptingStudents as AcceptingStudents | undefined,
      verificationStatus: dto.verificationStatus as VerificationStatus | undefined,
      sourceType: dto.sourceType as DataSource | undefined,
      isPublic: dto.isPublic,
      dataQualityScore: dto.dataQualityScore,
      lastSyncedAt: this.toDateOrUndefined(dto.lastSyncedAt),
      lastVerifiedAt: this.toDateOrUndefined(dto.lastVerifiedAt),
    };

    const updated = await this.prisma.professor.update({
      where: { id },
      data,
    });

    await this.adminService.writeAuditLog(
      adminId,
      'admin',
      'admin_professor_update',
      'professor',
      id,
      this.auditSnapshot(existing),
      this.auditSnapshot(updated),
    );

    return this.get(id);
  }

  async remove(id: string, adminId: string) {
    const existing = await this.prisma.professor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Professor not found');
    }

    await this.prisma.professor.update({
      where: { id },
      data: { status: 'inactive' },
    });

    await this.adminService.writeAuditLog(
      adminId,
      'admin',
      'admin_professor_delete',
      'professor',
      id,
      this.auditSnapshot(existing),
      { status: 'inactive' },
    );

    return { success: true };
  }

  async resync(id: string, adminId: string) {
    const existing = await this.prisma.professor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Professor not found');
    }

    const job = await this.professorSyncAdmin.runProfileSync(adminId, id);

    await this.adminService.writeAuditLog(
      adminId,
      'admin',
      'admin_professor_resync',
      'professor',
      id,
      this.auditSnapshot(existing),
      { jobId: job.jobId, queueName: job.queueName, status: job.status },
    );

    return {
      success: true,
      id,
      jobId: job.jobId,
      queueName: job.queueName,
      status: job.status,
    };
  }

  private buildWhere(filters: AdminProfessorFilterDto): Prisma.ProfessorWhereInput {
    const where: Prisma.ProfessorWhereInput = {};

    if (filters.q) {
      where.OR = [
        { fullName: { contains: filters.q } },
        { emails: { some: { email: { contains: filters.q } } } },
        { university: { name: { contains: filters.q } } },
        { department: { name: { contains: filters.q } } },
        { researchAreas: { some: { researchArea: { name: { contains: filters.q } } } } },
      ];
    }

    if (filters.university) {
      where.universityId = filters.university;
    }

    if (filters.country) {
      const existingAnd = Array.isArray(where.AND)
        ? where.AND
        : where.AND
          ? [where.AND]
          : [];
      where.AND = [
        ...existingAnd,
        {
          university: {
            country: {
              name: { contains: filters.country },
            },
          },
        },
      ];
    }

    if (filters.verificationStatus) {
      where.verificationStatus = filters.verificationStatus;
    }

    if (filters.acceptingStudents) {
      where.acceptingStudents = filters.acceptingStudents;
    }

    if (filters.sourceType) {
      where.sourceType = filters.sourceType;
    }

    if (typeof filters.hasEmail === 'boolean') {
      where.emails = filters.hasEmail
        ? { some: { isVerified: true } }
        : { none: { isVerified: true } };
    }

    if (typeof filters.isPublic === 'boolean') {
      where.isPublic = filters.isPublic;
    }

    if (filters.createdAtFrom || filters.createdAtTo) {
      where.createdAt = {};
      if (filters.createdAtFrom) where.createdAt.gte = new Date(filters.createdAtFrom);
      if (filters.createdAtTo) where.createdAt.lte = new Date(filters.createdAtTo);
    }

    if (filters.updatedAtFrom || filters.updatedAtTo) {
      where.updatedAt = {};
      if (filters.updatedAtFrom) where.updatedAt.gte = new Date(filters.updatedAtFrom);
      if (filters.updatedAtTo) where.updatedAt.lte = new Date(filters.updatedAtTo);
    }

    return where;
  }

  private buildOrderBy(sortBy?: string, sortOrder?: 'asc' | 'desc'): Prisma.ProfessorOrderByWithRelationInput {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    switch (sortBy) {
      case 'name':
        return { fullName: order };
      case 'university':
        return { university: { name: order } };
      case 'country':
        return { university: { country: { name: order } } };
      case 'verificationStatus':
        return { verificationStatus: order };
      case 'lastSyncedAt':
        return { lastSyncedAt: order };
      case 'dataQualityScore':
        return { dataQualityScore: order };
      case 'updatedAt':
        return { updatedAt: order };
      case 'createdAt':
      default:
        return { createdAt: order };
    }
  }

  private toDateOrUndefined(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return new Date(value);
  }

  private auditSnapshot(professor: {
    id: string;
    fullName: string;
    universityId: string;
    departmentId: string | null;
    verificationStatus: VerificationStatus;
    isPublic: boolean;
    sourceType: DataSource;
    dataQualityScore: number | null;
    lastSyncedAt: Date | null;
    lastVerifiedAt: Date | null;
    status: string;
  }) {
    return {
      id: professor.id,
      fullName: professor.fullName,
      universityId: professor.universityId,
      departmentId: professor.departmentId,
      verificationStatus: professor.verificationStatus,
      isPublic: professor.isPublic,
      sourceType: professor.sourceType,
      dataQualityScore: professor.dataQualityScore,
      lastSyncedAt: professor.lastSyncedAt,
      lastVerifiedAt: professor.lastVerifiedAt,
      status: professor.status,
    };
  }
}
