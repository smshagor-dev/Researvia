import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class StudentAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      throw new UnauthorizedException();
    }

    const normalizedRole = String(user.role || '').toLowerCase();
    if (normalizedRole === 'user' || normalizedRole === 'student') {
      return true;
    }

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (profile) {
      return true;
    }

    throw new ForbiddenException('Student access is only available to student-compatible accounts');
  }
}
