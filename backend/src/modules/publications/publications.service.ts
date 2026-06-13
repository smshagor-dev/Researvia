import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
@Injectable()
export class PublicationsService {
  constructor(private readonly prisma: PrismaService) {}
  async findByProfessor(professorId: string, page=1, perPage=20) {
    const skip=(page-1)*perPage;
    const [pubs,total]=await Promise.all([
      this.prisma.publication.findMany({ where:{professorId}, skip, take:perPage, orderBy:[{citationCount:'desc'},{publicationYear:'desc'}] }),
      this.prisma.publication.count({ where:{professorId} }),
    ]);
    return { data:pubs, meta:{page,perPage,total} };
  }
  async create(data: any) { return this.prisma.publication.create({ data }); }
}
