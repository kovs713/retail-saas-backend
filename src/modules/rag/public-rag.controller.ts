import { AnalyticsService } from '@/modules/analytics/analytics.service';
import { ShopService } from '@/modules/shop/shop.service';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ChatDto } from './dto/chat.dto';
import { RagService } from './rag.service';

import { Body, Controller, HttpCode, HttpStatus, Logger, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('Public RAG')
@Controller('public/chat')
@UseGuards(ThrottlerGuard)
export class PublicRagController {
  private readonly logger = new Logger(PublicRagController.name);

  constructor(
    private readonly ragService: RagService,
    private readonly shopService: ShopService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Post(':shopSlug')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60 } })
  @ApiOperation({ summary: 'Public RAG chat endpoint (no authentication required)' })
  @ApiParam({ name: 'shopSlug', description: 'Shop slug', example: 'my-shop' })
  @ApiBody({ type: ChatDto })
  @ApiResponse({ status: 200, description: 'Successful response', type: ChatResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  async chat(
    @Param('shopSlug') shopSlug: string,
    @Body() chatRequest: ChatDto,
  ): Promise<{ success: true; data: ChatResponseDto }> {
    const shop = await this.shopService.findBySlug(shopSlug);

    this.logger.log(`Public chat request for shop ${shop.id}: ${chatRequest.message.substring(0, 100)}...`);
    const result = await this.ragService.query(
      chatRequest.message,
      { shopId: shop.id },
      chatRequest.maxResults || 5,
      chatRequest.systemPrompt,
    );

    const response: ChatResponseDto = {
      answer: result.answer,
      sources: result.sources.map((source) => ({
        content: source.pageContent,
        metadata: source.metadata,
      })),
      timestamp: new Date().toISOString(),
    };

    await this.analyticsService.logChatEvent(shop.id, chatRequest.message, result.answer.length, result.sources.length);

    this.logger.log(`Public chat response for shop ${shop.id}: ${result.answer.substring(0, 100)}...`);

    return { success: true, data: response };
  }
}
