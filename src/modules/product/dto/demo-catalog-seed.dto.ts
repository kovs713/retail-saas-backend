import { ApiProperty } from '@nestjs/swagger';

export class DemoCatalogSeedResultDto {
  @ApiProperty({ example: '/app/data/demo-seed.csv' })
  seedPath: string;

  @ApiProperty({ example: true })
  dryRun: boolean;

  @ApiProperty({ example: 12 })
  csvProducts: number;

  @ApiProperty({ example: 12 })
  publishedCount: number;

  @ApiProperty({ example: 130 })
  hiddenCount: number;

  @ApiProperty({ example: 2 })
  skippedManualOverrideCount: number;

  @ApiProperty({ example: 4 })
  updatedQuantityCount: number;

  @ApiProperty({ example: 4 })
  updatedPriceCount: number;
}
