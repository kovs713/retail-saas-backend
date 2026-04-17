export const DocPreprocessorConfig = Symbol('DOC_PREPROCESSOR_CONFIG');
export const RagChatConfig = Symbol('RAG_CHAT_CONFIG');
export const ChromaDBClient = Symbol('CHROMADB_CLIENT');
export const ChatGroqClient = Symbol('CHAT_GROQ_CLIENT');
export const MinioConfig = Symbol('MINIO_CONFIG');
export const MinioClient = Symbol('MINIO_CLIENT');
export const RedisClient = Symbol('REDIS_CLIENT');
export const CacheTTL = Symbol('CacheTTL');
export const AuthConfig = Symbol('AUTH_CONFIG');
export const JwtConfig = Symbol('JWT_CONFIG');

export interface JwtOptions {
  secret: string;
  expiresIn: import('ms').StringValue;
}
