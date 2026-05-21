import {
  isEvotorDocumentPayload,
  isEvotorProductRawPayload,
  isEvotorProductsWebhookPayload,
  isEvotorSellDocumentPayload,
} from './evotor-type-guards';

const validSellPayload = {
  id: '47355c14-04da-486f-a6c6-b24689a82df7',
  type: 'SELL',
  extras: {},
  number: 76250,
  user_id: '01-000000001892466',
  version: 'V2',
  store_id: '20200812-D55B-40E4-8063-F2AF124593FC',
  device_id: '20200812-9F04-404B-80E7-F964AE3B10FB',
  close_date: '2026-05-16T07:39:55.000+0000',
  created_at: '2026-05-16T07:39:58.989+0000',
  body: {
    sum: 255,
    result_sum: 255,
    positions: [
      {
        id: 426754,
        sum: 170,
        tax: { type: 'NO_VAT', sum: 0, result_sum: 0 },
        product_id: '20ab0dd2-9ccf-47ed-bb04-7feecc4c86ae',
        product_name: 'Test Product',
        product_type: 'NORMAL',
        bar_code: '4606696009356',
        quantity: 1,
        initial_quantity: 13,
        price: 170,
        result_price: 170,
        result_sum: 170,
      },
    ],
    payments: [
      {
        id: 'b3935520-9152-46b8-9c44-aa6399f1390b',
        sum: 255,
        type: 'ELECTRON',
        parts: [
          {
            change: 0,
            part_sum: 255,
            print_group_id: '46dd89f0-3a54-470a-a166-ad01fa34b86a',
          },
        ],
      },
    ],
  },
};

const validProductsPayload = [
  {
    uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Test Product',
    group: false,
    price: 100,
    quantity: 10,
  },
  {
    uuid: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    name: 'Another Product',
    group: true,
  },
];

describe('isEvotorSellDocumentPayload', () => {
  it('returns true for valid SELL document', () => {
    expect(isEvotorSellDocumentPayload(validSellPayload)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isEvotorSellDocumentPayload(null)).toBe(false);
  });

  it('returns false for non-SELL type', () => {
    expect(
      isEvotorSellDocumentPayload({ ...validSellPayload, type: 'BUY' }),
    ).toBe(false);
  });

  it('returns false for missing body.positions', () => {
    const bad = { ...validSellPayload, body: { result_sum: 100 } };
    expect(isEvotorSellDocumentPayload(bad)).toBe(false);
  });

  it('returns false for random object', () => {
    expect(isEvotorSellDocumentPayload({ foo: 'bar' })).toBe(false);
  });

  it('returns false for primitive', () => {
    expect(isEvotorSellDocumentPayload('string')).toBe(false);
    expect(isEvotorSellDocumentPayload(42)).toBe(false);
  });
});

describe('isEvotorProductsWebhookPayload', () => {
  it('returns true for valid product array', () => {
    expect(isEvotorProductsWebhookPayload(validProductsPayload)).toBe(true);
  });

  it('returns true for empty array', () => {
    expect(isEvotorProductsWebhookPayload([])).toBe(true);
  });

  it('returns false for non-array', () => {
    expect(isEvotorProductsWebhookPayload({})).toBe(false);
  });

  it('returns false for array with invalid item', () => {
    expect(isEvotorProductsWebhookPayload([{ uuid: 'x', name: 'test' }])).toBe(
      false,
    );
  });

  it('returns false for null', () => {
    expect(isEvotorProductsWebhookPayload(null)).toBe(false);
  });
});

describe('isEvotorDocumentPayload', () => {
  it('returns true for SELL-like object', () => {
    expect(isEvotorDocumentPayload(validSellPayload)).toBe(true);
  });

  it('returns true for generic document with id, type, body', () => {
    expect(
      isEvotorDocumentPayload({
        id: 'doc-uuid',
        type: 'PAYBACK',
        body: { result_sum: 100 },
      }),
    ).toBe(true);
  });

  it('returns false for null', () => {
    expect(isEvotorDocumentPayload(null)).toBe(false);
  });

  it('returns false for random object', () => {
    expect(isEvotorDocumentPayload({ foo: 'bar' })).toBe(false);
  });

  it('returns false for missing body', () => {
    expect(isEvotorDocumentPayload({ id: 'x', type: 'SELL' })).toBe(false);
  });
});

describe('isEvotorProductRawPayload', () => {
  it('returns true for product-like object', () => {
    expect(
      isEvotorProductRawPayload({
        uuid: 'prod-uuid',
        name: 'Test Product',
        group: false,
      }),
    ).toBe(true);
  });

  it('returns true for object with only name', () => {
    expect(isEvotorProductRawPayload({ name: 'Product' })).toBe(true);
  });

  it('returns false for random object', () => {
    expect(isEvotorProductRawPayload({ foo: 'bar' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isEvotorProductRawPayload(null)).toBe(false);
  });

  it('returns false for array', () => {
    expect(isEvotorProductRawPayload([])).toBe(false);
  });
});
