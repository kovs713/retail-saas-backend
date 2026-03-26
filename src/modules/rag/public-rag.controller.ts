import { CacheService } from '@/core/cache/cache.service';
import { AnalyticsService } from '@/modules/analytics/analytics.service';
import { ShopService } from '@/modules/shop/shop.service';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ChattDto } from './dto/chat.dto';
import { RagService } from './rag.service';

import { Body, Controller, HttpCode, HttpException, HttpStatus, Logger, Param, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('public-rag')
@Controller('public/chat')
export class PublicRagController {
  private readonly logger = new Logger(PublicRagController.name);

  constructor(
    private readonly ragService: RagService,
    private readonly shopService: ShopService,
    private readonly analyticsService: AnalyticsService,
    private readonly cacheService: CacheService,
  ) {}

  @Post(':shopSlug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Public RAG chat endpoint (no authentication required)' })
  @ApiParam({ name: 'shopSlug', description: 'Shop slug', example: 'my-shop' })
  @ApiBody({ type: ChattDto })
  @ApiResponse({ status: 200, description: 'Successful response', type: ChatResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  async chat(
    @Param('shopSlug') shopSlug: string,
    @Body() chatRequest: ChattDto,
    @Req() request: Request,
  ): Promise<{ success: true; data: ChatResponseDto }> {
    // Rate limiting: 20 requests per minute per IP
    const ip = request.ip || request.connection.remoteAddress || '';
    const rateLimitKey = `rate_limit:${ip}:public-chat`;
    const cachedCount = await this.cacheService.get<number>(rateLimitKey);
    const currentCount = cachedCount !== null && typeof cachedCount === 'number' ? cachedCount : 0;

    if (currentCount >= 20) {
      throw new HttpException('Rate limit exceeded. Maximum 20 requests per minute.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Increment rate limit counter
    await this.cacheService.set(rateLimitKey, currentCount + 1, 60); // 60 seconds TTL

    // Find shop by slug - throws NotFoundException if not found
    const shop = await this.shopService.findBySlug(shopSlug);

    // Log the chat event for analytics (we'll do this after we get the answer)
    // Perform RAG query
    this.logger.log(`Public chat request for shop ${shop.id}: ${chatRequest.message.substring(0, 100)}...`);
    const result = await this.ragService.query(
      chatRequest.message,
      { shopId: shop.id }, // tenant context
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

    // Log the chat event
    await this.analyticsService.logChatEvent(shop.id, chatRequest.message, result.answer.length, result.sources.length);

    this.logger.log(`Public chat response for shop ${shop.id}: ${result.answer.substring(0, 100)}...`);

    return { success: true, data: response };
  }
}
