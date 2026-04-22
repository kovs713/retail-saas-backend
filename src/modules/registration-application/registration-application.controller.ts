import { Roles } from '@/common/decorators';
import { ApiResponse as AppApiResponse } from '@/common/dto';
import { Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { RegistrationApplicationDto, RejectRegistrationApplicationDto } from './dto';
import { RegistrationApplicationService } from './registration-application.service';

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Registration Applications')
@ApiBearerAuth('JWT')
@Controller('admin/registration-applications')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class RegistrationApplicationController {
  constructor(private readonly registrationApplicationService: RegistrationApplicationService) {}

  @Get()
  @ApiOperation({ summary: 'List registration applications' })
  @ApiResponse({ status: 200, description: 'Applications retrieved successfully', type: [RegistrationApplicationDto] })
  async list(): Promise<AppApiResponse<RegistrationApplicationDto[]>> {
    const applications = await this.registrationApplicationService.list();
    return { success: true, data: RegistrationApplicationDto.fromEntities(applications) };
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve registration application' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Application approved successfully', type: RegistrationApplicationDto })
  async approve(@Param('id') id: string): Promise<AppApiResponse<RegistrationApplicationDto>> {
    const application = await this.registrationApplicationService.approve(id);
    return {
      success: true,
      data: RegistrationApplicationDto.fromEntity(application),
      message: 'Registration application approved successfully',
    };
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject registration application' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Application rejected successfully', type: RegistrationApplicationDto })
  async reject(
    @Param('id') id: string,
    @Body() body: RejectRegistrationApplicationDto,
  ): Promise<AppApiResponse<RegistrationApplicationDto>> {
    const application = await this.registrationApplicationService.reject(id, body.reason);
    return {
      success: true,
      data: RegistrationApplicationDto.fromEntity(application),
      message: 'Registration application rejected successfully',
    };
  }
}
