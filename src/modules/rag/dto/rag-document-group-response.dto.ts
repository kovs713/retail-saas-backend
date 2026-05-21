import { ApiProperty } from '@nestjs/swagger';
import { DocumentGroupDto } from './document-group.dto';

export class RagDocumentGroupResponseDto {
  @ApiProperty({ description: 'Document group UUID' })
  documentGroupId: string;

  @ApiProperty({ description: 'Number of chunks' })
  totalChunks: number;

  @ApiProperty({ description: 'Timestamp when document was added' })
  timestamp: string;

  @ApiProperty({ description: 'Document group data' })
  group: DocumentGroupDto;
}
