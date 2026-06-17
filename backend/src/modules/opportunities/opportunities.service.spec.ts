import { OpportunitiesService } from './opportunities.service';

describe('OpportunitiesService', () => {
  it('charges only on the first opportunity unlock', async () => {
    const prisma = {
      opportunity: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'opp-1',
          title: 'Research Assistantship',
        }),
      },
      opportunityUnlock: {
        findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'unlock-1', unlockedAt: new Date('2026-06-15T00:00:00Z') }),
      },
      $transaction: jest.fn(),
    };
    const tx = {
      opportunityUnlock: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));

    const credits = { adjustWithTransaction: jest.fn().mockResolvedValue(undefined) };
    const usage = { assertWithinLimit: jest.fn().mockResolvedValue(undefined), recordUsage: jest.fn().mockResolvedValue(undefined) };
    const pagination = { clampPage: jest.fn(), clampPerPage: jest.fn(), getSkip: jest.fn(), paginate: jest.fn() };
    const notifications = { create: jest.fn() };

    const service = new OpportunitiesService(
      prisma as any,
      pagination as any,
      notifications as any,
      credits as any,
      usage as any,
    );

    const first = await service.unlock('user-1', 'opp-1');
    const second = await service.unlock('user-1', 'opp-1');

    expect(first).toEqual({ unlocked: true, alreadyUnlocked: false, creditsCharged: 5 });
    expect(second).toEqual(expect.objectContaining({ unlocked: true, alreadyUnlocked: true }));
    expect(credits.adjustWithTransaction).toHaveBeenCalledTimes(1);
  });
});
