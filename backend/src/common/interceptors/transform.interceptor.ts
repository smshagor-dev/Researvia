import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const requestId = context.switchToHttp().getRequest().headers['x-request-id'] || uuidv4();

    return next.handle().pipe(
      map((data) => {
        // If data already has standard envelope shape, pass through
        if (data && (data.data !== undefined || data.error !== undefined)) return data;
        return {
          data,
          meta: { timestamp: new Date().toISOString(), requestId },
        };
      }),
    );
  }
}
