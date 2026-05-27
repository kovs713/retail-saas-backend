# Retail SaaS Backend - Agent Guidelines

## Build/Lint/Test Commands

- `pnpm run build` — nest build
- `pnpm run start:dev` — dev watch mode
- `pnpm run lint` — ESLint with auto-fix
- `pnpm run format` — Prettier (80 char width, single quotes, trailing commas)
- `pnpm run test` — unit tests only (excludes integration)
- `pnpm run test:integration` — testcontainers-backed (60s timeout, serial)
- `pnpm run test:e2e` — full HTTP tests via supertest
- `pnpm run test -- path/to/file.spec.ts` — single file
- `pnpm run start:prod` — production mode (`node dist/main`)

## Testing Patterns

- **Unit tests**: co-located (`*.spec.ts`), Jest + `@golevelup/ts-jest` `createMock`
- **Integration tests**: `test/integration/` (`*.integration.spec.ts`), use testcontainers for Postgres 16 Alpine
- **E2E tests**: `test/e2e/` (`*.e2e-spec.ts`), supertest, mock all services
- **Factories** for test data: `@/core/database/factories` (`createAuthResponseDto`, `createTokenPayload`, etc.)
- **Cache mocking**: `mockCacheService()` from `@/common/utils`
- **Test setup**: `jest.setup.ts` suppresses NestJS Logger; integration uses `test/integration/setup.ts`
- **CI pipeline**: lint → unit tests → build (no integration/e2e in CI)
- **Order**: run `pnpm run lint && pnpm run test && pnpm run build` before pushing

## Architecture

- **10 feature modules** under `src/modules/`: admin, analytics, doc-preprocessor, evotor, order, product, rag, registration-application, shop, user
- **5 core modules** under `src/core/`: auth, cache, database, logger, object-storage
- **Path aliases**: `@/core/*`, `@/common/*`, `@/modules/*` (maps to `src/`)
- **Dynamic modules**: AuthModule, CacheModule, ObjectStorageModule, RagModule, DocPreprocessorModule, LLMModule, VectorStoreModule, EvotorApiModule all use `forRoot()`/`forRootAsync()` pattern
- **Database**: `autoLoadEntities: true`, `synchronize: true` only in DEVELOPMENT, `search_path=public`
- **Body limit**: 10mb, `rawBody: true` globally
- **Swagger**: at `/api`; WebSocket chat at `/chat`
- **Throttler**: Redis-backed via `@nest-lab/throttler-storage-redis`
- **JWT**: registered in global `CommonModule`, configured via `JWT_SECRET` and `JWT_EXPIRED_TIME`
- **Refresh token**: cookie-based (`refreshToken` cookie)
- **Doc-preprocessor**: external Python microservice (`apps/doc-preprocessor/`, Dockerfile)

## Conventions

- `I` prefix for interfaces (e.g., `IUserService`)
- `Dto`/`Entity`/`Service`/`Controller`/`Module`/`Guard`/`Exception` suffixes
- NestJS exceptions for errors (`ConflictException`, `NotFoundException`, `BadRequestException`, etc.)
- `no-console`: warn (ESLint); use `LoggerService` wrapper
- Test files: `@typescript-eslint/no-unsafe-*` and `unbound-method` disabled
- Guard files: `no-unsafe-assignment`, `no-unsafe-member-access` disabled

## Environment

- Copy `.env.example` → `.env`
- Infrastructure via `docker-compose up -d` (postgres, redis, chromadb, minio, ollama, doc-preprocessor)
- Test infra via `docker-compose -f docker-compose.test.yml up -d` (postgres, minio, chromadb on alt ports)
- Node 20+, pnpm 10, `--frozen-lockfile` in CI
