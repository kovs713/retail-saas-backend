import { createMock } from '@golevelup/ts-jest';
import type { Response } from 'express';

describe('diag', () => {
  it('plain object setHeader', async () => {
    const res = { setHeader: jest.fn() } as unknown as Response;
    res.setHeader('test', 'value');
    if ((res.setHeader as jest.Mock).mock.calls.length === 0) {
      throw new Error('FAIL: plain obj calls=0');
    }
  });

  it('createMock with setHeader', async () => {
    const res = createMock<Response>({ setHeader: jest.fn() });
    res.setHeader('test', 'value');
    if ((res.setHeader as jest.Mock).mock.calls.length === 0) {
      throw new Error('FAIL: createMock calls=0');
    }
  });
});
