import {
  Controller, Post, Get, Body, Query, UseGuards,
  HttpCode, HttpStatus, Req, Res, Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto, LoginDto, RefreshTokenDto, ForgotPasswordDto,
  ResetPasswordDto, ChangePasswordDto, Enable2FADto, Verify2FADto, TempToken2FADto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Public } from '../../common/decorators';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register new user' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/password' })
  async login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto, req.ip);
  }

  @Post('2fa/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete 2FA login with temp token' })
  async verify2FA(@Body() dto: TempToken2FADto) {
    // handled within login flow
    return { message: 'Use /auth/login with totpCode field' };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id, user.sessionId);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser('id') userId: string) {
    return this.authService.logoutAll(userId);
  }

  @Get('verify-email')
  @Public()
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async enable2FA(@CurrentUser('id') userId: string, @Body() dto: Enable2FADto) {
    return this.authService.enable2FA(userId, dto.password);
  }

  @Post('2fa/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async confirm2FA(@CurrentUser('id') userId: string, @Body() dto: Verify2FADto) {
    return this.authService.confirm2FA(userId, dto.totpCode);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async disable2FA(@CurrentUser('id') userId: string, @Body() dto: Verify2FADto) {
    return this.authService.disable2FA(userId, dto.totpCode);
  }
}
