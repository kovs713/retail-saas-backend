import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum AdminDashboardPeriod {
  TODAY = 'today',
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
}

export class AdminDashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Time period for dashboard data',
    enum: AdminDashboardPeriod,
    example: '7d',
  })
  @IsOptional()
  @IsEnum(AdminDashboardPeriod)
  period?: AdminDashboardPeriod;

  @ApiPropertyOptional({
    description: 'Custom start date (ISO 8601)',
    example: '2026-05-09T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Custom end date (ISO 8601)',
    example: '2026-05-16T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
