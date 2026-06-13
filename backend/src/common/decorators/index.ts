import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { RequestUser } from '../types';

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: RequestUser = request.user;
    return data ? user?.[data] : user;
  },
);

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

export const RequiresPlan = (...features: string[]) => SetMetadata('required_plan_features', features);

export const RequiresCredits = (amount: number) => SetMetadata('required_credits', amount);

export const Public = () => SetMetadata('is_public', true);

export const SkipThrottle = () => SetMetadata('skipThrottle', true);
