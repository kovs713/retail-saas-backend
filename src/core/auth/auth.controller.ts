import { ApiResponse as AppApiResponse } from '@/common/dto';
import { AuthService } from './auth.service';
import { AuthOutputDto, RefreshTokenDto, RegisterDto, SignInDto } from './dto';

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user and create a shop' })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthOutputDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 409, description: 'Conflict - Email or shop slug already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AppApiResponse<AuthOutputDto>> {
    const result = await this.authService.register(registerDto);
    return { success: true, data: result, message: 'User registered successfully' };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthOutputDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid credentials' })
  async login(@Body() signInDto: SignInDto): Promise<AppApiResponse<AuthOutputDto>> {
    const result = await this.authService.signIn(signInDto);
    return { success: true, data: result, message: 'Login successful' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully', type: AuthOutputDto })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AppApiResponse<AuthOutputDto>> {
    const result = await this.authService.refreshToken(refreshTokenDto.refreshToken);
    return { success: true, data: result, message: 'Token refreshed successfully' };
  }
}
