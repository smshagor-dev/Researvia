import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
@Injectable()
export class ResearchAreasService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() { return this.prisma.researchArea.findMany({ orderBy: [{ level:'asc' },{ name:'asc' }] }); }
  async findOne(id: string) { return this.prisma.researchArea.findUnique({ where: { id } }); }
  async create(data: any) { return this.prisma.researchArea.create({ data }); }
  async update(id: string, data: any) { return this.prisma.researchArea.update({ where: { id }, data }); }
}
