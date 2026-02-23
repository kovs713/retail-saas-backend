import { Request as BaseRequest } from 'express';
import { TokenPayload } from '@/modules/auth/types/token-payload.type';

export type Request = BaseRequest & {
  user: TokenPayload;
};
