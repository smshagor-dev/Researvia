import { ScholarshipsService } from './scholarships.service';

describe('ScholarshipsService', () => {
  it('charges only on the first scholarship unlock', async () => {
    const prisma = {
      scholarship: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'sch-1',
          title: 'PhD Funding',
          isActive: true,
          isExpired: false,
        }),
      },
      scholarshipUnlock: {
        findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'unlock-1', unlockedAt: new Date('2026-06-15T00:00:00Z') }),
        create: jest.fn().mockResolvedValue(undefined),
      },
      $transaction: jest.fn(),
    };
    const tx = {
      scholarshipUnlock: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));

    const credits = { adjustWithTransaction: jest.fn().mockResolvedValue(undefined) };
    const usage = { assertWithinLimit: jest.fn().mockResolvedValue(undefined), recordUsage: jest.fn().mockResolvedValue(undefined) };
    const pagination = { clampPage: jest.fn(), clampPerPage: jest.fn(), getSkip: jest.fn(), paginate: jest.fn() };
    const service = new ScholarshipsService(prisma as any, pagination as any, credits as any, usage as any);

    const first = await service.unlock('user-1', 'sch-1');
    const second = await service.unlock('user-1', 'sch-1');

    expect(first).toEqual({ unlocked: true, alreadyUnlocked: false, creditsCharged: 5 });
    expect(second).toEqual(expect.objectContaining({ unlocked: true, alreadyUnlocked: true }));
    expect(credits.adjustWithTransaction).toHaveBeenCalledTimes(1);
  });
});
