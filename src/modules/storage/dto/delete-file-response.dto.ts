import { ApiProperty } from '@nestjs/swagger';

export class DeleteFileResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: "File 'documents/report.pdf' deleted successfully",
  })
  message: string;
}
