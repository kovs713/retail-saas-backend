import { User } from '@/common/decorators';
import { ApiResponse as AppApiResponse } from '@/common/dto';
import { AuthGuard } from '@/common/guards';
import { AuthConfig, Request, TokenPayload } from '@/common/types';
import { AuthOptions } from './auth.module';
import { AuthService } from './auth.service';
import { AuthResponseDto, RegisterDto, SignInDto, UserInfoDto } from './dto';

import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthConfig)
    private readonly authConfig: AuthOptions,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user and create a shop' })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 409, description: 'Conflict - Email or shop slug already exists' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AppApiResponse<AuthResponseDto>> {
    const result = await this.authService.register(registerDto);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return { success: true, data: result, message: 'User registered successfully' };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid credentials' })
  async login(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AppApiResponse<AuthResponseDto>> {
    const result = await this.authService.signIn(signInDto);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return { success: true, data: result, message: 'Login successful' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
  @ApiCookieAuth()
  @ApiResponse({ status: 200, description: 'Token refreshed successfully', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AppApiResponse<AuthResponseDto>> {
    const refreshToken = this.extractCookie(req, this.authConfig.refreshTokenCookie);

    if (!refreshToken) {
      const { UnauthorizedException } = await import('@nestjs/common');
      throw new UnauthorizedException('Refresh token not found');
    }

    const result = await this.authService.refreshToken(refreshToken);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return { success: true, data: result, message: 'Token refreshed successfully' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'User profile retrieved', type: UserInfoDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async me(@User() payload: TokenPayload): Promise<AppApiResponse<UserInfoDto>> {
    const user = await this.authService.getProfile(payload.sub);

    return { success: true, data: user };
  }

  private setRefreshTokenCookie(res: Response, refreshToken?: string): void {
    if (!refreshToken) return;

    res.cookie(this.authConfig.refreshTokenCookie, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.authConfig.refreshTokenMaxAge,
      path: '/auth',
    });
  }

  private extractCookie(req: Request, name: string): string | undefined {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return undefined;

    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match?.[1];
  }
}
