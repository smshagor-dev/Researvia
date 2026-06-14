import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextState {
  requestId: string;
  ip?: string | null;
  userAgent?: string | null;
  path?: string | null;
  method?: string | null;
  userId?: string | null;
  sessionId?: string | null;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextState>();

  run<T>(state: RequestContextState, callback: () => T): T {
    return this.storage.run(state, callback);
  }

  get(): RequestContextState | undefined {
    return this.storage.getStore();
  }

  assign(partial: Partial<RequestContextState>) {
    const current = this.storage.getStore();
    if (!current) return;
    Object.assign(current, partial);
  }
}
