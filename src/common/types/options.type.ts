export interface EvotorOptions {
  baseUrl: string;
  token: string;
}

export interface MinioOptions {
  host: string;
  port: number;
  accessKey: string;
  secretKey: string;
  userSSL: boolean;
  bucket: string;
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
