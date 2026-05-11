import { Tenant, User } from '@/common/decorators';
import { ApiResponse as AppApiResponse } from '@/common/dto';
import { AuthGuard } from '@/common/guards';
import { TenantContext, TokenPayload } from '@/common/types';
import {
  ChatMessageEntry,
  ChatSessionDto,
  ChatSessionMetadataDto,
} from '../dto';
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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Chat Sessions')
@ApiBearerAuth('JWT')
@Controller('rag/sessions')
@UseGuards(AuthGuard)
export class ChatSessionController {
  constructor(private readonly chatSessionService: ChatSessionService) {}

  @Post()
  @ApiOperation({ summary: 'Create chat session' })
  @ApiResponse({
    status: 201,
    description: 'Chat session created',
    type: ChatSessionDto,
  })
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
  @ApiResponse({
    status: 200,
    description: 'Chat sessions retrieved',
    type: ChatSessionMetadataDto,
    isArray: true,
  })
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

  @Get(':id/messages')
  @ApiOperation({ summary: 'List chat session messages' })
  @ApiResponse({
    status: 200,
    description: 'Chat session messages retrieved',
    type: ChatMessageEntry,
    isArray: true,
  })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  async listSessionMessages(
    @Param('id') id: string,
    @Tenant() tenantContext: TenantContext,
    @User() user: TokenPayload,
  ): Promise<AppApiResponse<ChatMessageEntry[]>> {
    const messages = await this.chatSessionService.listSessionMessages(
      id,
      tenantContext.shopId,
      user.sub,
    );
    return { success: true, data: messages };
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive chat session' })
  @ApiResponse({
    status: 200,
    description: 'Chat session archived',
    type: ChatSessionDto,
  })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
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
  @ApiResponse({
    status: 200,
    description: 'Chat session deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
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
