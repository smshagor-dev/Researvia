import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { SystemSettingsService } from '../system-settings/system-settings.service';

@Injectable()
export class NowPaymentsService {
  private client: AxiosInstance | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  isEnabled() {
    return Boolean(
      this.config.get<string>('NOWPAYMENTS_API_KEY')
      && this.config.get<string>('NOWPAYMENTS_IPN_SECRET'),
    );
  }

  async getPaymentMethodConfig() {
    return {
      provider: 'nowpayments',
      enabled: this.isEnabled(),
      successUrl: await this.resolveSuccessUrl(),
      cancelUrl: await this.resolveCancelUrl(),
      callbackUrl: await this.resolveCallbackUrl(),
      supportedCurrencies: await this.getSupportedCurrencies(),
    };
  }

  async createInvoice(input: {
    orderId: string;
    priceAmount: number;
    priceCurrency: string;
    payCurrency?: string;
    orderDescription: string;
    successUrl?: string | null;
    cancelUrl?: string | null;
    ipnCallbackUrl?: string | null;
  }) {
    const client = await this.getClient();
    const payload = {
      price_amount: Number(input.priceAmount.toFixed(2)),
      price_currency: input.priceCurrency.toLowerCase(),
      pay_currency: input.payCurrency?.toLowerCase(),
      order_id: input.orderId,
      order_description: input.orderDescription,
      ipn_callback_url: input.ipnCallbackUrl || await this.resolveCallbackUrl(),
      success_url: input.successUrl || await this.resolveSuccessUrl(),
      cancel_url: input.cancelUrl || await this.resolveCancelUrl(),
    };

    const response = await client.post('/invoice', payload);
    return response.data;
  }

  verifyIpnSignature(rawBody: Buffer | string, signature?: string) {
    const secret = this.config.get<string>('NOWPAYMENTS_IPN_SECRET');
    if (!secret || !signature) {
      return false;
    }

    const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
    const expected = createHmac('sha512', secret).update(body).digest('hex');
    const actual = signature.trim().toLowerCase();

    try {
      return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
    } catch {
      return false;
    }
  }

  mapTransactionStatus(status?: string) {
    const normalized = String(status || '').toLowerCase();
    if (['finished', 'confirmed', 'sending'].includes(normalized)) {
      return 'confirmed' as const;
    }
    if (['failed', 'refunded'].includes(normalized)) {
      return 'failed' as const;
    }
    if (normalized === 'expired') {
      return 'expired' as const;
    }
    if (normalized === 'cancelled' || normalized === 'canceled') {
      return 'cancelled' as const;
    }
    return 'pending' as const;
  }

  private async getClient() {
    if (this.client) {
      return this.client;
    }

    const apiKey = this.config.get<string>('NOWPAYMENTS_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('NOWPayments is not configured');
    }

    const baseURL =
      await this.systemSettings.getString('billing.nowpayments.api_url')
      || this.config.get<string>('NOWPAYMENTS_API_URL')
      || 'https://api.nowpayments.io/v1';

    this.client = axios.create({
      baseURL,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    });

    return this.client;
  }

  private async getSupportedCurrencies() {
    const configured = await this.systemSettings.getStringArray('billing.nowpayments.supported_currencies');
    if (configured.length) {
      return configured;
    }

    const envValue = this.config.get<string>('NOWPAYMENTS_SUPPORTED_CURRENCIES');
    if (!envValue) {
      return ['btc', 'eth', 'usdttrc20'];
    }

    return envValue.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  }

  private async resolveSuccessUrl() {
    return await this.systemSettings.getString('billing.nowpayments.success_url')
      || this.config.get<string>('NOWPAYMENTS_SUCCESS_URL')
      || `${this.config.get('FRONTEND_URL') || 'http://localhost:3000'}/billing?crypto=success`;
  }

  private async resolveCancelUrl() {
    return await this.systemSettings.getString('billing.nowpayments.cancel_url')
      || this.config.get<string>('NOWPAYMENTS_CANCEL_URL')
      || `${this.config.get('FRONTEND_URL') || 'http://localhost:3000'}/billing?crypto=cancelled`;
  }

  private async resolveCallbackUrl() {
    const configured =
      await this.systemSettings.getString('billing.nowpayments.ipn_callback_url')
      || this.config.get<string>('NOWPAYMENTS_IPN_CALLBACK_URL');
    if (configured) {
      return configured;
    }

    const appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3001';
    return `${appUrl.replace(/\/$/, '')}/v1/webhooks/nowpayments`;
  }
}
