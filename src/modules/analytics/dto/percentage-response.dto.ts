import { IsNumber } from 'class-validator';

export class PercentageResponseDto {
  @IsNumber()
  current: number;

  @IsNumber()
  percentFromLastMonth: number;
}
