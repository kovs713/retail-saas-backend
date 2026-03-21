import { Request as BaseRequest } from 'express';
import { TokenPayload } from './token-payload.type';

export type Request = BaseRequest & {
  user: TokenPayload;
};
