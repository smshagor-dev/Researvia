import { AiController } from './ai.controller';

describe('AiController', () => {
  it('deducts credits and records usage for outreach generation', async () => {
    const aiService = { generateOutreach: jest.fn().mockResolvedValue('stream') };
    const creditsService = { deduct: jest.fn().mockResolvedValue({ balance: 90 }) };
    const usage = {
      assertWithinLimit: jest.fn().mockResolvedValue(undefined),
      recordUsage: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new AiController(aiService as any, creditsService as any, usage as any);

    const res = {} as any;
    await controller.generateOutreach('user-1', { professorId: 'prof-1' }, res);

    expect(usage.assertWithinLimit).toHaveBeenCalledWith('user-1', 'ai_generation');
    expect(creditsService.deduct).toHaveBeenCalledWith(
      'user-1',
      10,
      'ai_generation',
      'prof-1',
      'professors',
      'AI outreach email generation',
    );
    expect(usage.recordUsage).toHaveBeenCalledWith('user-1', 'ai_generation');
    expect(aiService.generateOutreach).toHaveBeenCalledWith('user-1', 'prof-1', { professorId: 'prof-1' }, res);
  });
});
