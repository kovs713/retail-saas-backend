import { ChatEvent } from '@/modules/analytics/entities/chat-event.entity';
import { StorefrontView } from '@/modules/analytics/entities/storefront-view.entity';

interface CreateChatEventOptions {
  id?: string;
  shopId?: string;
  userQuery?: string;
  answerLength?: number;
  sourcesCount?: number;
  createdAt?: Date;
}

interface CreateStorefrontViewOptions {
  id?: string;
  shopId?: string;
  createdAt?: Date;
}

export function createChatEvent(options: CreateChatEventOptions = {}): ChatEvent {
  return {
    id: options.id ?? 'chat_event_001',
    shop: null as any,
    shopId: options.shopId ?? 'shop_001',
    userQuery: options.userQuery ?? 'test query',
    answerLength: options.answerLength ?? 100,
    sourcesCount: options.sourcesCount ?? 3,
    createdAt: options.createdAt ?? new Date(),
  } as ChatEvent;
}

export function createChatEvents(count: number, options: CreateChatEventOptions = {}): ChatEvent[] {
  return Array.from({ length: count }, (_, i) =>
    createChatEvent({
      ...options,
      id: options.id ?? `chat_event_${String(i + 1).padStart(3, '0')}`,
    }),
  );
}

export function createStorefrontView(options: CreateStorefrontViewOptions = {}): StorefrontView {
  return {
    id: options.id ?? 'view_001',
    shop: null as any,
    shopId: options.shopId ?? 'shop_001',
    createdAt: options.createdAt ?? new Date(),
  } as StorefrontView;
}

export function createStorefrontViews(count: number, options: CreateStorefrontViewOptions = {}): StorefrontView[] {
  return Array.from({ length: count }, (_, i) =>
    createStorefrontView({
      ...options,
      id: options.id ?? `view_${String(i + 1).padStart(3, '0')}`,
    }),
  );
}
