import { ProfessorsService } from './professors.service';

describe('ProfessorsService', () => {
  it('does not double-charge when an email was already revealed', async () => {
    const prisma = {
      professor: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'prof-1',
          emails: [{ id: 'email-1', email: 'prof@example.edu', type: 'work', isPrimary: true }],
        }),
      },
      emailRevealLog: {
        findUnique: jest.fn().mockResolvedValue({
          email: { email: 'prof@example.edu', type: 'work', isPrimary: true },
        }),
      },
    };
    const credits = { getBalance: jest.fn(), adjustWithTransaction: jest.fn() };
    const usage = { assertWithinLimit: jest.fn(), recordUsage: jest.fn() };
    const audit = { logUserAction: jest.fn() };
    const pagination = { clampPage: jest.fn(), clampPerPage: jest.fn(), getSkip: jest.fn(), paginate: jest.fn() };

    const service = new ProfessorsService(
      prisma as any,
      {} as any,
      pagination as any,
      credits as any,
      usage as any,
      audit as any,
    );

    await expect(service.revealEmail('prof-1', 'user-1')).resolves.toEqual({
      emails: [{ email: 'prof@example.edu', type: 'work', isPrimary: true }],
      alreadyRevealed: true,
      creditsCharged: 0,
    });

    expect(usage.assertWithinLimit).not.toHaveBeenCalled();
    expect(credits.adjustWithTransaction).not.toHaveBeenCalled();
  });
});
