import { ChatEvent, StorefrontView } from '@/modules/analytics/entities';
import { DEFAULT_IDS } from './defaults';
import { createMany, generateId } from './shared.utils';

export function createChatEvent(
  overrides: Partial<ChatEvent> & { index?: number } = {},
): ChatEvent {
  const { index = 1, ...fields } = overrides;
  return {
    id: generateId('chat_event', index),
    shopId: DEFAULT_IDS.shopId(index),
    userQuery: 'test query',
    answerLength: 100,
    sourcesCount: 3,
    createdAt: new Date(),
    ...fields,
  } as ChatEvent;
}

export function createChatEvents(
  count: number,
  overrides: Partial<ChatEvent> = {},
): ChatEvent[] {
  return createMany(count, (i) => createChatEvent({ ...overrides, index: i }));
}

export function createStorefrontView(
  overrides: Partial<StorefrontView> & { index?: number } = {},
): StorefrontView {
  const { index = 1, ...fields } = overrides;
  return {
    id: generateId('view', index),
    shopId: DEFAULT_IDS.shopId(index),
    createdAt: new Date(),
    ...fields,
  } as StorefrontView;
}

export function createStorefrontViews(
  count: number,
  overrides: Partial<StorefrontView> = {},
): StorefrontView[] {
  return createMany(count, (i) =>
    createStorefrontView({ ...overrides, index: i }),
  );
}
