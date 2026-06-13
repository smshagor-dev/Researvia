import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}
  async findByUniversity(universityId: string) {
    return this.prisma.department.findMany({ where: { universityId }, orderBy: { name: 'asc' } });
  }
  async create(data: any) { return this.prisma.department.create({ data }); }
  async update(id: string, data: any) { return this.prisma.department.update({ where: { id }, data }); }
  async delete(id: string) { return this.prisma.department.delete({ where: { id } }); }
}
