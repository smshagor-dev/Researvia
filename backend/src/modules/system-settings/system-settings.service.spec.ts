import { SystemSettingsService } from './system-settings.service';

describe('SystemSettingsService', () => {
  it('returns defaults when DB rows are missing', async () => {
    const prisma = {
      systemSetting: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new SystemSettingsService(prisma as any);

    await expect(service.getStringArray('billing.nowpayments.supported_currencies')).resolves.toEqual([
      'btc',
      'eth',
      'usdttrc20',
    ]);
    await expect(service.getBoolean('email.allow_fallback')).resolves.toBe(false);
  });

  it('prefers DB values over defaults', async () => {
    const prisma = {
      systemSetting: {
        findUnique: jest.fn().mockResolvedValue({ key: 'email.allow_fallback', valueJson: true }),
      },
    };
    const service = new SystemSettingsService(prisma as any);

    await expect(service.getBoolean('email.allow_fallback')).resolves.toBe(true);
  });
});
