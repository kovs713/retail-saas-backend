import { Tenant, User } from '@/common/decorators';
import { ApiResponse as AppApiResponse } from '@/common/dto';
import { TenantContext, TokenPayload } from '@/common/types';
import { ChatSessionMetadataDto, ChatSessionDto } from '../dto';
import { ChatSessionService } from './chat-session.service';

import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '@/common/guards';

@ApiTags('Chat Sessions')
@ApiBearerAuth('JWT')
@Controller('rag/sessions')
@UseGuards(AuthGuard)
export class ChatSessionController {
  constructor(private readonly chatSessionService: ChatSessionService) {}

  @Post()
  @ApiOperation({ summary: 'Create chat session' })
  async createSession(
    @Tenant() tenantContext: TenantContext,
    @User() user: TokenPayload,
  ): Promise<AppApiResponse<ChatSessionDto>> {
    const session = await this.chatSessionService.createSession(
      tenantContext.shopId,
      user.sub,
    );
    return { success: true, data: session };
  }

  @Get()
  @ApiOperation({ summary: 'List chat sessions' })
  async listSessions(
    @Query('status') status: 'active' | 'archived' = 'active',
    @Tenant() tenantContext: TenantContext,
    @User() user: TokenPayload,
  ): Promise<AppApiResponse<ChatSessionMetadataDto[]>> {
    const sessions = await this.chatSessionService.listSessions(
      tenantContext.shopId,
      user.sub,
      status,
    );
    return { success: true, data: sessions };
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive chat session' })
  async archiveSession(
    @Param('id') id: string,
    @Tenant() tenantContext: TenantContext,
    @User() user: TokenPayload,
  ): Promise<AppApiResponse<ChatSessionDto>> {
    const session = await this.chatSessionService.archiveSession(
      id,
      tenantContext.shopId,
      user.sub,
    );
    return { success: true, data: session };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete chat session permanently' })
  async deleteSession(
    @Param('id') id: string,
    @Tenant() tenantContext: TenantContext,
    @User() user: TokenPayload,
  ): Promise<AppApiResponse<void>> {
    await this.chatSessionService.deleteSession(
      id,
      tenantContext.shopId,
      user.sub,
    );
    return { success: true, message: 'Chat session deleted successfully' };
  }
}
