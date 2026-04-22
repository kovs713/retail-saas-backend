import {
  createChatEvent,
  createChatEvents,
  createStorefrontView,
  createStorefrontViews,
} from './analytics.factory';

describe('analytics.factory', () => {
  describe('createChatEvent', () => {
    it('should create chat event with default values', () => {
      const chatEvent = createChatEvent();

      expect(chatEvent.id).toBe('chat_event_001');
      expect(chatEvent.shopId).toBe('shop_001');
      expect(chatEvent.userQuery).toBe('test query');
      expect(chatEvent.answerLength).toBe(100);
      expect(chatEvent.sourcesCount).toBe(3);
    });

    it('should create chat event with custom index', () => {
      const chatEvent = createChatEvent({ index: 5 });

      expect(chatEvent.id).toBe('chat_event_005');
      expect(chatEvent.shopId).toBe('shop_005');
    });

    it('should allow overriding userQuery', () => {
      const chatEvent = createChatEvent({
        userQuery: 'What products do you have?',
      });

      expect(chatEvent.userQuery).toBe('What products do you have?');
    });

    it('should allow overriding answerLength', () => {
      const chatEvent = createChatEvent({ answerLength: 500 });

      expect(chatEvent.answerLength).toBe(500);
    });

    it('should allow overriding sourcesCount', () => {
      const chatEvent = createChatEvent({ sourcesCount: 10 });

      expect(chatEvent.sourcesCount).toBe(10);
    });

    it('should allow overriding shopId', () => {
      const chatEvent = createChatEvent({ shopId: 'custom-shop' });

      expect(chatEvent.shopId).toBe('custom-shop');
    });

    it('should create chat event with createdAt timestamp', () => {
      const chatEvent = createChatEvent();

      expect(chatEvent.createdAt).toBeInstanceOf(Date);
    });

    it('should exclude index from resulting object', () => {
      const chatEvent = createChatEvent({ index: 1 });

      expect('index' in chatEvent).toBe(false);
    });
  });

  describe('createChatEvents', () => {
    it('should create specified number of chat events', () => {
      const events = createChatEvents(3);

      expect(events).toHaveLength(3);
    });

    it('should create chat events with sequential indices', () => {
      const events = createChatEvents(3);

      expect(events[0].id).toBe('chat_event_001');
      expect(events[1].id).toBe('chat_event_002');
      expect(events[2].id).toBe('chat_event_003');
    });

    it('should apply overrides to all chat events', () => {
      const events = createChatEvents(2, { sourcesCount: 5 });

      expect(events[0].sourcesCount).toBe(5);
      expect(events[1].sourcesCount).toBe(5);
    });

    it('should create chat events with distinct IDs', () => {
      const events = createChatEvents(3);

      const ids = events.map((e) => e.id);
      expect(new Set(ids).size).toBe(3);
    });
  });

  describe('createStorefrontView', () => {
    it('should create storefront view with default values', () => {
      const view = createStorefrontView();

      expect(view.id).toBe('view_001');
      expect(view.shopId).toBe('shop_001');
    });

    it('should create storefront view with custom index', () => {
      const view = createStorefrontView({ index: 5 });

      expect(view.id).toBe('view_005');
      expect(view.shopId).toBe('shop_005');
    });

    it('should allow overriding shopId', () => {
      const view = createStorefrontView({ shopId: 'custom-shop' });

      expect(view.shopId).toBe('custom-shop');
    });

    it('should create storefront view with createdAt timestamp', () => {
      const view = createStorefrontView();

      expect(view.createdAt).toBeInstanceOf(Date);
    });

    it('should exclude index from resulting object', () => {
      const view = createStorefrontView({ index: 1 });

      expect('index' in view).toBe(false);
    });
  });

  describe('createStorefrontViews', () => {
    it('should create specified number of storefront views', () => {
      const views = createStorefrontViews(3);

      expect(views).toHaveLength(3);
    });

    it('should create storefront views with sequential indices', () => {
      const views = createStorefrontViews(3);

      expect(views[0].id).toBe('view_001');
      expect(views[1].id).toBe('view_002');
      expect(views[2].id).toBe('view_003');
    });

    it('should apply overrides to all storefront views', () => {
      const views = createStorefrontViews(2, { shopId: 'shared-shop' });

      expect(views[0].shopId).toBe('shared-shop');
      expect(views[1].shopId).toBe('shared-shop');
    });

    it('should create storefront views with distinct IDs', () => {
      const views = createStorefrontViews(3);

      const ids = views.map((v) => v.id);
      expect(new Set(ids).size).toBe(3);
    });
  });
});
