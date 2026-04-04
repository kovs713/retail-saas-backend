import { DEFAULT_CONTACTS, DEFAULT_IDS, DEFAULT_TOKENS } from './defaults';

describe('defaults', () => {
  describe('DEFAULT_IDS', () => {
    describe('shopId', () => {
      it('should generate shop id with default index of 1', () => {
        expect(DEFAULT_IDS.shopId()).toBe('shop_001');
      });

      it('should generate shop id with custom index', () => {
        expect(DEFAULT_IDS.shopId(5)).toBe('shop_005');
      });
    });

    describe('userId', () => {
      it('should generate user id with default index of 1', () => {
        expect(DEFAULT_IDS.userId()).toBe('user_001');
      });

      it('should generate user id with custom index', () => {
        expect(DEFAULT_IDS.userId(5)).toBe('user_005');
      });
    });

    describe('categoryId', () => {
      it('should generate category id with default index of 1', () => {
        expect(DEFAULT_IDS.categoryId()).toBe('cat_001');
      });

      it('should generate category id with custom index', () => {
        expect(DEFAULT_IDS.categoryId(5)).toBe('cat_005');
      });
    });

    describe('orderId', () => {
      it('should generate order id with default index of 1', () => {
        expect(DEFAULT_IDS.orderId()).toBe('order_001');
      });

      it('should generate order id with custom index', () => {
        expect(DEFAULT_IDS.orderId(5)).toBe('order_005');
      });
    });
  });

  describe('DEFAULT_CONTACTS', () => {
    it('should have default email', () => {
      expect(DEFAULT_CONTACTS.email).toBe('test@example.com');
    });

    it('should have default phone', () => {
      expect(DEFAULT_CONTACTS.phone).toBe('+1234567890');
    });

    it('should have default customer name', () => {
      expect(DEFAULT_CONTACTS.customerName).toBe('Test Customer');
    });
  });

  describe('DEFAULT_TOKENS', () => {
    it('should have default access token', () => {
      expect(DEFAULT_TOKENS.accessToken).toBe('mock-access-token');
    });

    it('should have default refresh token', () => {
      expect(DEFAULT_TOKENS.refreshToken).toBe('mock-refresh-token');
    });

    it('should have default password hash', () => {
      expect(DEFAULT_TOKENS.passwordHash).toBe('hashed-password');
    });
  });
});
