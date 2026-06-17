import { NowPaymentsService } from './nowpayments.service';

describe('NowPaymentsService', () => {
  it('prefers DB-backed runtime settings for supported currencies', async () => {
    const config = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          NOWPAYMENTS_API_KEY: 'np-key',
          FRONTEND_URL: 'http://localhost:3000',
          APP_URL: 'http://localhost:3001',
        };
        return values[key];
      }),
    };
    const systemSettings = {
      getString: jest.fn().mockResolvedValue(null),
      getStringArray: jest.fn().mockResolvedValue(['btc', 'usdttrc20']),
    };

    const service = new NowPaymentsService(config as any, systemSettings as any);

    await expect(service.getPaymentMethodConfig()).resolves.toEqual(
      expect.objectContaining({
        enabled: true,
        supportedCurrencies: ['btc', 'usdttrc20'],
      }),
    );
  });
});
