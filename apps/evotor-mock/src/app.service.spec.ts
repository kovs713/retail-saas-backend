import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
  });

  it('binds a shop to phone and imeis and seeds products once', () => {
    const result = (service as any).bindTerminals('shop-1', '+79990001122', [
      '111111111111111',
      '222222222222222',
    ]);

    expect(result.store).toEqual(
      expect.objectContaining({
        id: 'store-shop-1',
        phone: '+79990001122',
      }),
    );
    expect(result.devices).toEqual([
      expect.objectContaining({
        id: 'device-store-shop-1-111111111111111',
        phone: '+79990001122',
        imei: '111111111111111',
      }),
      expect.objectContaining({
        id: 'device-store-shop-1-222222222222222',
        phone: '+79990001122',
        imei: '222222222222222',
      }),
    ]);
    expect(result.seededProductsCount).toBe(12);
    expect(service.getProductsByStoreId('store-shop-1')).toHaveLength(12);

    const secondResult = (service as any).bindTerminals(
      'shop-1',
      '+79990001122',
      ['111111111111111'],
    );

    expect(secondResult.seededProductsCount).toBe(0);
    expect(service.getProductsByStoreId('store-shop-1')).toHaveLength(12);
    expect(service.getDevicesByStoreId('store-shop-1')).toEqual([
      expect.objectContaining({
        id: 'device-store-shop-1-111111111111111',
        imei: '111111111111111',
      }),
    ]);
  });
});
