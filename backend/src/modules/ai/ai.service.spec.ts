import { AiService } from './ai.service';

describe('AiService', () => {
  it('uses DB-backed AI runtime settings with demo fallback', async () => {
    const service = new AiService(
      {} as any,
      {} as any,
      { get: jest.fn().mockReturnValue('') } as any,
      {} as any,
      {
        getString: jest.fn()
          .mockResolvedValueOnce('anthropic')
          .mockResolvedValueOnce('claude-sonnet-test'),
      } as any,
    );

    const res = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    } as any;

    await (service as any).streamFromAI('system', 'user', res);

    expect(res.end).toHaveBeenCalled();
    expect(res.write).toHaveBeenCalled();
  });
});
