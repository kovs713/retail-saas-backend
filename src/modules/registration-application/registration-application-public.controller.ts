import { ApiResponse as AppApiResponse } from '@/common/dto';
import {
  CreateRegistrationApplicationDto,
  RegisterApplicationResponseDto,
} from './dto';
import { RegistrationApplicationService } from './registration-application.service';

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class RegistrationApplicationPublicController {
  constructor(
    private readonly registrationApplicationService: RegistrationApplicationService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a registration application',
  })
  @ApiResponse({
    status: 201,
    description: 'Registration application created successfully',
    type: RegisterApplicationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email or shop slug already exists',
  })
  async register(
    @Body()
    registerDto: CreateRegistrationApplicationDto,
  ): Promise<AppApiResponse<RegisterApplicationResponseDto>> {
    const application =
      await this.registrationApplicationService.create(registerDto);

    return {
      success: true,
      data: {
        id: application.id,
        email: application.email,
        shopName: application.shopName,
        shopSlug: application.shopSlug,
        status: application.status,
      },
      message: 'Registration application created successfully',
    };
  }
}
