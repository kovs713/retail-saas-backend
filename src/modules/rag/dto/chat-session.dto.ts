import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageEntry {
  @ApiPropertyOptional({ example: 'message-1' })
  id?: string;

  @ApiProperty({ example: 'user', enum: ['user', 'assistant'] })
  role: 'user' | 'assistant';

  @ApiProperty({ example: 'Need phones' })
  content: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;
}

export class ChatSessionDto {
  @ApiProperty({ example: 'session-1' })
  id: string;

  @ApiProperty({ example: 'shop-1' })
  shopId: string;

  @ApiProperty({ example: 'user-1' })
  userId: string;

  @ApiProperty({ example: 'Need phones' })
  title: string;

  @ApiProperty({ example: 'active', enum: ['active', 'archived'] })
  status: 'active' | 'archived';

  @ApiProperty({ type: ChatMessageEntry, isArray: true })
  messages: ChatMessageEntry[];

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  lastMessageAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class ChatSessionMetadataDto {
  @ApiProperty({ example: 'session-1' })
  id: string;

  @ApiProperty({ example: 'Need phones' })
  title: string;

  @ApiProperty({ example: 'active', enum: ['active', 'archived'] })
  status: 'active' | 'archived';

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  lastMessageAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: string;
}
