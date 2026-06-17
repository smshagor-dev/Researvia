import { BadRequestException } from '@nestjs/common';
import { EmailMessagesService } from './email-messages.service';

describe('EmailMessagesService', () => {
  it('fails fast when the daily email send limit is reached', async () => {
    const prisma = {
      emailMessage: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'msg-1',
          userId: 'user-1',
          threadId: 'thread-1',
          status: 'queued',
          subject: 'Hello',
          bodyText: 'Test',
          toEmails: ['prof@example.edu'],
          thread: { id: 'thread-1', accountType: 'smtp', accountId: 'acct-1', currentStage: 'planned' },
          attachments: [],
        }),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    const usage = {
      assertWithinLimit: jest.fn().mockRejectedValue(new BadRequestException('Usage limit reached')),
      recordUsage: jest.fn(),
    };
    const audit = { logUserAction: jest.fn() };
    const systemSettings = { getBoolean: jest.fn().mockResolvedValue(false) };

    const service = new EmailMessagesService(
      prisma as any,
      {} as any,
      { get: jest.fn() } as any,
      {} as any,
      {} as any,
      usage as any,
      audit as any,
      systemSettings as any,
    );

    await expect(service.sendMessage('msg-1')).rejects.toBeInstanceOf(BadRequestException);

    expect(usage.assertWithinLimit).toHaveBeenCalledWith('user-1', 'email_send');
    expect(prisma.emailMessage.update).toHaveBeenCalledWith({
      where: { id: 'msg-1' },
      data: { status: 'failed', errorMessage: 'Usage limit reached' },
    });
    expect(usage.recordUsage).not.toHaveBeenCalled();
  });
});
