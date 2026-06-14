import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

let sdk: NodeSDK | null = null;

export async function startOpenTelemetry() {
  if (process.env.OTEL_ENABLED !== 'true' || sdk) return;

  sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME || 'researvia-backend',
    instrumentations: [getNodeAutoInstrumentations()],
  });

  await sdk.start();
}

export async function stopOpenTelemetry() {
  if (!sdk) return;
  await sdk.shutdown();
  sdk = null;
}
