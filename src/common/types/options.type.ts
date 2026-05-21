export interface EvotorOptions {
  baseUrl: string;
  adminToken: string;
  timeoutMs: number;
}

export interface S3Options {
  host: string;
  port: number;
  accessKey: string;
  secretKey: string;
  useSSL: boolean;
  bucket: string;
  region: string;
}

export interface RagChatOptions {
  WsRateLimitWindow: number;
  WsRateLimitMax: number;
  ChatSessionTtl: number;
}

export interface DocPreprocessorOptions {
  docPreprocessorTimeoutMs: number;
  docPreprocessorUrl: string;
}

export interface AuthOptions {
  refreshTokenCookie: string;
  refreshTokenMaxAge: number;
}

export interface JwtOptions {
  secret: string;
  expiresIn: import('ms').StringValue;
}
