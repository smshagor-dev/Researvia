import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { Response } from 'express';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async generateOutreach(
    userId: string,
    professorId: string,
    opts: { tone?: string; highlights?: string[]; wordLimit?: number },
    res: Response,
  ) {
    const [professor, userProfile] = await Promise.all([
      this.prisma.professor.findFirst({
        where: { id: professorId },
        include: {
          university: true,
          researchAreas: { include: { researchArea: true }, take: 5 },
          publications: { orderBy: { citationCount: 'desc' }, take: 3 },
        },
      }),
      this.prisma.userProfile.findUnique({ where: { userId } }),
    ]);

    if (!professor) throw new BadRequestException('Professor not found');

    const researchAreas = professor.researchAreas.map((r) => r.researchArea.name).join(', ');
    const recentPubs = professor.publications.map((p) => `"${p.title}" (${p.publicationYear})`).join('\n');
    const tone = opts.tone || 'formal';
    const wordLimit = opts.wordLimit || 250;

    const systemPrompt = `You are an expert academic email writer. Write professional, personalized outreach emails to university professors. Emails should be concise (${wordLimit} words max), specific to the professor's research, professional yet genuine, free of generic flattery, and reference specific research work.`;

    const userPrompt = `Write a ${tone} outreach email to:
Professor: ${professor.fullName}, ${professor.position || 'Professor'} at ${professor.university.name}
Research areas: ${researchAreas}
Recent publications:
${recentPubs || 'Not available'}

Student background:
Bio: ${userProfile?.bio || 'Graduate student'}
Research interests: ${JSON.stringify(userProfile?.researchInterests || [])}
Target degree: ${userProfile?.targetDegree || 'PhD'}
${opts.highlights?.length ? `Key highlights to include: ${opts.highlights.join(', ')}` : ''}

Write only the email body. Start with "Dear Prof. ${professor.lastName || professor.fullName},"`;

    return this.streamFromAI(systemPrompt, userPrompt, res);
  }

  async generateFollowup(userId: string, threadId: string, opts: { tone?: string }, res: Response) {
    const thread = await this.prisma.emailThread.findFirst({
      where: { id: threadId, userId },
      include: {
        professor: { include: { university: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { direction: true, bodyText: true, sentAt: true, createdAt: true },
        },
      },
    });
    if (!thread) throw new BadRequestException('Thread not found');

    const lastSent = thread.messages.find((m) => m.direction === 'outbound');
    const daysSince = lastSent
      ? Math.floor((Date.now() - new Date(lastSent.sentAt || lastSent.createdAt).getTime()) / 86400000)
      : 14;
    const hasReply = thread.messages.some((m) => m.direction === 'inbound');

    const systemPrompt = `You are an academic email writer. Write a professional follow-up email.`;
    const userPrompt = `Write a follow-up email for this situation:
Professor: ${thread.professor?.fullName || 'Professor'} at ${thread.professor?.university?.name || 'University'}
Original email sent ${daysSince} days ago
${hasReply ? 'Professor has replied — write a thank-you/continuation response' : 'No reply yet — write a gentle reminder'}
Tone: ${opts.tone || 'formal'}
Keep it under 150 words. Start with "Dear Prof. ${thread.professor?.lastName || 'Professor'},"`;

    return this.streamFromAI(systemPrompt, userPrompt, res);
  }

  async getMatchScore(userId: string, professorId: string) {
    const cacheKey = `match:${userId}:${professorId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [professor, userProfile] = await Promise.all([
      this.prisma.professor.findFirst({
        where: { id: professorId },
        include: { researchAreas: { include: { researchArea: true } } },
      }),
      this.prisma.userProfile.findUnique({ where: { userId } }),
    ]);

    if (!professor || !userProfile) {
      return { score: 0, breakdown: {}, explanation: 'Insufficient profile data' };
    }

    const userInterests: string[] = (userProfile.researchInterests as string[]) || [];
    const profAreas = professor.researchAreas.map((r) => r.researchArea.slug);

    // Research overlap (Jaccard similarity)
    const intersection = userInterests.filter((i) => profAreas.includes(i));
    const union = [...new Set([...userInterests, ...profAreas])];
    const researchOverlap = union.length > 0 ? Math.round((intersection.length / union.length) * 100) : 0;

    // Funding match
    let fundingMatch = 50;
    if (professor.fundingStatus === 'funded') fundingMatch = 100;
    else if (professor.fundingStatus === 'unfunded') fundingMatch = 0;

    // Accepting students
    let acceptingMatch = 50;
    if (professor.acceptingStudents === 'yes') acceptingMatch = 100;
    else if (professor.acceptingStudents === 'no') acceptingMatch = 0;

    // Composite score
    const score = Math.round(
      researchOverlap * 0.5 + fundingMatch * 0.25 + acceptingMatch * 0.25,
    );

    const result = {
      score,
      breakdown: { researchOverlap, fundingMatch, acceptingMatch },
      explanation: this.buildMatchExplanation(score, researchOverlap, fundingMatch, acceptingMatch, professor, intersection),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 3600 * 24);
    return result;
  }

  async getScholarshipRecommendations(userId: string) {
    const cacheKey = `scholarship_matches:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const userProfile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!userProfile) return [];

    const userInterests: string[] = (userProfile.researchInterests as string[]) || [];
    const targetCountries: string[] = (userProfile.targetCountries as string[]) || [];
    const targetDegree = userProfile.targetDegree;

    const scholarships = await this.prisma.scholarship.findMany({
      where: { isActive: true, isExpired: false },
      include: { country: true, university: true },
      take: 100,
    });

    const scored = scholarships.map((s) => {
      let score = 0;
      const degreeLevels = s.degreeLevels as string[];
      if (targetDegree && degreeLevels.includes(targetDegree)) score += 40;
      if (targetCountries.length && s.country && targetCountries.includes(s.country.isoAlpha2)) score += 30;
      if (s.fundingType === 'fully_funded') score += 20;
      const fieldsOfStudy = (s.fieldsOfStudy as string[]) || [];
      const overlap = userInterests.filter((i) => fieldsOfStudy.includes(i));
      score += Math.min(10, overlap.length * 5);
      if (s.deadline) {
        const daysUntil = Math.floor((new Date(s.deadline).getTime() - Date.now()) / 86400000);
        if (daysUntil > 0 && daysUntil < 30) score += 5; // deadline soon bonus
      }
      return { ...s, matchScore: score };
    });

    const top = scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
    await this.redis.set(cacheKey, JSON.stringify(top), 3600 * 24);
    return top;
  }

  private async streamFromAI(systemPrompt: string, userPrompt: string, res: Response) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!apiKey) {
      // Demo mode: stream a placeholder
      const demo = `Dear Professor,\n\nI am writing to express my interest in pursuing doctoral research under your supervision. Your work in this area has greatly inspired my research direction.\n\nBest regards`;
      for (const char of demo) {
        res.write(`data: ${JSON.stringify({ text: char })}\n\n`);
        await new Promise((r) => setTimeout(r, 10));
      }
      res.write('event: done\ndata: {}\n\n');
      res.end();
      return;
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          stream: true,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((l) => l.startsWith('data:'));
        for (const line of lines) {
          const data = line.slice(5).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      this.logger.error(`AI stream error: ${err.message}`);
      res.write(`data: ${JSON.stringify({ error: 'AI generation failed' })}\n\n`);
    }

    res.write('event: done\ndata: {}\n\n');
    res.end();
  }

  private buildMatchExplanation(
    score: number, researchOverlap: number, fundingMatch: number,
    acceptingMatch: number, professor: any, intersection: string[],
  ): string {
    const parts: string[] = [];
    if (researchOverlap > 60) parts.push(`Strong research alignment in: ${intersection.slice(0, 3).join(', ')}`);
    else if (researchOverlap > 30) parts.push('Moderate research overlap');
    else parts.push('Limited research overlap');

    if (fundingMatch === 100) parts.push('Professor has confirmed funding');
    if (acceptingMatch === 100) parts.push('Currently accepting students');
    else if (acceptingMatch === 0) parts.push('Not currently accepting students');

    return `Match score ${score}/100. ${parts.join('. ')}.`;
  }
}
