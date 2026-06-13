import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  async autocomplete(q: string, type: string) {
    if (!q || q.length < 2) return [];
    const cacheKey = `autocomplete:${type}:${q.toLowerCase()}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    let results: any[] = [];
    if (type === 'professors' || !type) {
      const profs = await this.prisma.professor.findMany({
        where: { fullName: { contains: q }, status: 'active' },
        take: 8, select: { id: true, fullName: true, avatarUrl: true, university: { select: { name: true } } },
      });
      results = [...results, ...profs.map(p => ({ type: 'professor', id: p.id, label: p.fullName, sublabel: p.university?.name }))];
    }
    if (type === 'universities' || !type) {
      const unis = await this.prisma.university.findMany({
        where: { name: { contains: q }, status: 'active' },
        take: 5, select: { id: true, name: true, logoUrl: true, country: { select: { name: true } } },
      });
      results = [...results, ...unis.map(u => ({ type: 'university', id: u.id, label: u.name, sublabel: u.country?.name }))];
    }
    if (type === 'scholarships' || !type) {
      const schs = await this.prisma.scholarship.findMany({
        where: { title: { contains: q }, isActive: true },
        take: 5, select: { id: true, title: true, fundingType: true },
      });
      results = [...results, ...schs.map(s => ({ type: 'scholarship', id: s.id, label: s.title, sublabel: s.fundingType }))];
    }
    if (type === 'research_areas' || !type) {
      const areas = await this.prisma.researchArea.findMany({
        where: { name: { contains: q } },
        take: 5, select: { id: true, name: true, slug: true },
      });
      results = [...results, ...areas.map(a => ({ type: 'research_area', id: a.id, label: a.name, sublabel: a.slug }))];
    }

    await this.redis.set(cacheKey, JSON.stringify(results), 300);
    return results;
  }

  async globalSearch(q: string) {
    const [professors, scholarships, universities] = await Promise.all([
      this.prisma.professor.findMany({
        where: { fullName: { contains: q }, status: 'active' },
        take: 5,
        include: { university: { select: { name: true } } },
      }),
      this.prisma.scholarship.findMany({ where: { title: { contains: q }, isActive: true }, take: 5 }),
      this.prisma.university.findMany({ where: { name: { contains: q }, status: 'active' }, take: 5 }),
    ]);
    return { professors, scholarships, universities };
  }
}
