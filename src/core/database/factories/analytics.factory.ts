import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { Shop } from '@/modules/shop/entities';

import { createShop } from './shop.factory';
import { generateId } from './shared.utils';

const DEFAULTS = {
  userQuery: 'test query',
  answerLength: 100,
  sourcesCount: 3,
};

function defaultShopId(index: number): string {
  return createShop({ index }).id;
}

interface ChatEventFactoryOptions {
  index?: number;
  overrides?: Partial<ChatEvent>;
}

function buildChatEvent(options: ChatEventFactoryOptions = {}): ChatEvent {
  const { index = 1, overrides = {} } = options;

  return {
    id: overrides.id ?? generateId('chat_event', index),
    shop: (overrides.shop ?? null) as unknown as Shop,
    shopId: overrides.shopId ?? defaultShopId(index),
    userQuery: overrides.userQuery ?? DEFAULTS.userQuery,
    answerLength: overrides.answerLength ?? DEFAULTS.answerLength,
    sourcesCount: overrides.sourcesCount ?? DEFAULTS.sourcesCount,
    createdAt: overrides.createdAt ?? new Date(),
  } as ChatEvent;
}

export function createChatEvent(options: ChatEventFactoryOptions = {}): ChatEvent {
  return buildChatEvent(options);
}

export function createChatEvents(count: number, options: Omit<ChatEventFactoryOptions, 'index'> = {}): ChatEvent[] {
  return Array.from({ length: count }, (_, i) => buildChatEvent({ ...options, index: i + 1 }));
}

interface StorefrontViewFactoryOptions {
  index?: number;
  overrides?: Partial<StorefrontView>;
}

function buildStorefrontView(options: StorefrontViewFactoryOptions = {}): StorefrontView {
  const { index = 1, overrides = {} } = options;

  return {
    id: overrides.id ?? generateId('view', index),
    shop: (overrides.shop ?? null) as unknown as Shop,
    shopId: overrides.shopId ?? defaultShopId(index),
    createdAt: overrides.createdAt ?? new Date(),
  } as StorefrontView;
}

export function createStorefrontView(options: StorefrontViewFactoryOptions = {}): StorefrontView {
  return buildStorefrontView(options);
}

export function createStorefrontViews(
  count: number,
  options: Omit<StorefrontViewFactoryOptions, 'index'> = {},
): StorefrontView[] {
  return Array.from({ length: count }, (_, i) => buildStorefrontView({ ...options, index: i + 1 }));
}
