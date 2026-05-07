# Retail SaaS Backend - Agent Guidelines

## Build/Lint/Test Commands

### Core Commands

- `pnpm run build` - Build the application
- `pnpm run start` - Start the application
- `pnpm run start:dev` - Development mode with watch
- `pnpm run start:debug` - Debug mode with watch
- `pnpm run start:prod` - Production mode

### Code Quality

- `pnpm run lint` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier

### Testing

- `pnpm run test` - Run unit tests (excludes integration)
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:cov` - Run tests with coverage
- `pnpm run test:debug` - Debug tests
- `pnpm run test:integration` - Run integration tests
- `pnpm run test:e2e` - Run end-to-end tests

### Docker

- `pnpm run docker:build` - Build Docker image
- `pnpm run docker:run` - Run Docker container

### Running Single Tests

- Unit test: `pnpm run test -- path/to/file.spec.ts`
- Integration test: `pnpm run test:integration -- path/to/file.integration.spec.ts`
- E2E test: `pnpm run test:e2e -- path/to/file.e2e-spec.ts`
- Debug single test: `pnpm run test:debug` then use debugger
- Watch specific test: `pnpm run test -- path/to/file.spec.ts --watch`

## Code Style Guidelines

### Import Style

- Use absolute imports with `src/` aliases (`@/core/*`, `@/common/*`, `@/modules/*`)
- Group imports: external libraries first, then internal modules
- Use named imports when possible
- Import paths should be relative to src/ directory when using aliases

### Formatting

- Prettier config: 120 char width, single quotes, trailing commas, 2-space indent
- Semicolons required, arrow parens always
- `eslint.config.mjs`: flat config with TypeScript ESLint + Prettier

### TypeScript

- `tsconfig.json`: ES2023 target, strictNullChecks true, noImplicitAny false
- Decorators enabled (emitDecoratorMetadata, experimentalDecorators)
- Path aliases: `@/core/*`, `@/common/*`, `@/modules/*`
- Enable strict mode for better type safety
- Skip lib check for faster builds

### Naming Conventions

- PascalCase: classes, interfaces, decorators
- camelCase: variables, functions, methods
- kebab-case: file names
- Descriptive names with context
- Interface names start with 'I' (e.g., IUserService)
- DTO suffix for data transfer objects (e.g., CreateUserDto)
- Entity suffix for database entities (e.g., UserEntity)
- Service suffix for business logic (e.g., UserService)
- Controller suffix for HTTP handlers (e.g., UserController)
- Module suffix for NestJS modules (e.g., UserModule)
- Util suffix for utility functions (e.g., StringUtil)
- Guard suffix for auth guards (e.g., AuthGuard)
- Exception suffix for custom exceptions (e.g., NotFoundException)

### Error Handling

- Use NestJS exceptions: `ConflictException`, `NotFoundException`, `BadRequestException`, `UnauthorizedException`, etc.
- Try-catch with `AppLogger` for logging
- Re-throw errors after logging
- No `console.log` (ESLint rule: warn)
- Handle promise rejections with try/catch or .catch()
- Validate DTOs with class-validator and class-transformer
- Use Zod for runtime validation when needed
- Return appropriate HTTP status codes

### Project Structure

```
src/
├── core/               # Core modules (auth, logger, cache, database)
├── common/             # Shared utils, decorators, dto, types
├── modules/            # Feature modules (rag, product, storage, user, org, shop, category)
├── app.module.ts       # Root application module
└── main.ts             # Entry point (Swagger, CORS, ValidationPipe)
test/
├── unit/               # Unit tests (*.spec.ts)
├── integration/        # Integration tests (*.integration.spec.ts)
└── e2e/                # E2E tests (*.e2e-spec.ts)
```

### Key Development Patterns

- **DI**: NestJS constructor injection with `@InjectRepository`
- **Services**: Business logic in services, controllers thin
- **DTOs**: class-validator + class-transformer for validation
- **Guards**: Auth guards for protected routes
- **Logging**: LoggerService (NestJS Logger wrapper)
- **Testing**: Jest with `@golevelup/ts-jest`, module mocking
- **Tenant Context**: Multi-tenant via `TenantContext` interface
- **Caching**: Redis-based caching with CacheService
- **Events**: Event-driven architecture for loose coupling
- **Validation**: Pipeline validation with built-in ValidationPipe
- **Documentation**: Swagger/OpenAPI with JSDoc annotations

### ESLint Rules (eslint.config.mjs)

- `@typescript-eslint/no-explicit-any`: off
- `@typescript-eslint/no-floating-promises`: warn
- `@typescript-eslint/no-unsafe-argument`: warn
- `no-console`: warn
- Test files (`*.spec.ts`, `*.e2e-spec.ts`): off for unbound-method, no-unsafe-assignment/member-access/call/argument
- Guard files: off for no-unsafe-assignment/member-access
- Uses type-checked parser (`projectService: true`)

### Jest Config

- Module aliases mapped to `src/`
- Coverage excludes: `dist`, `*.spec.ts`, `*.integration.spec.ts`, test utils, __mocks__
- Setup: `jest.setup.ts` (suppresses NestJS logger)
- Transform: ts-jest, no ignore patterns
- Test environment: node
- Timeout: 5000ms for unit tests, 30000ms for e2e tests
- Parallel test execution: maxWorkers: 50%

### Technology Stack

- **Framework**: NestJS v11 + TypeScript v5
- **Database**: PostgreSQL + TypeORM
- **Cache**: Redis (`redis` package, v5+)
- **Vector DB**: ChromaDB (RAG)
- **Storage**: MinIO S3
- **AI/ML**: LangChain, Groq, Ollama
- **Auth**: JWT + bcryptjs
- **Validation**: class-validator, class-transformer, Zod
- **Testing**: Jest, @golevelup/ts-jest, SuperTest
- **Containerization**: Docker
- **CI/CD**: GitHub Actions (implied)
- **API Docs**: Swagger/OpenAPI
- **Logging**: Winston-compatible logger

### Database Guidelines

- Use TypeORM decorators for entities
- Primary keys: UUID v4 with @PrimaryGeneratedColumn('uuid')
- Soft deletes: @DeleteDateColumn
- Timestamps: @CreateDateColumn, @UpdateDateColumn
- Relations: @ManyToOne, @OneToMany, @ManyToMany with proper join columns
- Indexes: Add @Index for frequently queried columns
- Constraints: Use @Unique, @Check for data integrity
- Migrations: TypeORM CLI for schema changes
- Seeding: Factory pattern for test data

### API Guidelines

- RESTful API design with proper HTTP verbs
- Resource naming: plural nouns (e.g., /users, /products)
- Response format: { success: boolean, data: any, message?: string }
- Pagination: limit/offset or cursor-based
- Filtering: query parameters for filtering
- Sorting: sort parameter with field:direction format
- Search: q parameter for full-text search
- Status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 500 Internal Server Error
- Headers: Content-Type: application/json, Authorization: Bearer <token>
- CORS: Configured for allowed origins
- Rate limiting: Implemented via NestJS Throttler
- Security: Helmet, CSRF protection, input sanitization

### Testing Guidelines

- Unit tests: Test individual functions/methods in isolation
- Integration tests: Test service interactions with databases/external services
- E2E tests: Test full API flows with real requests
- Mocking: Use @golevelup/ts-jest for mocking dependencies
- Test data: Use factories or fixtures for consistent test data
- Test coverage: Aim for 80%+ coverage
- Test naming: describe() for units, it() for behaviors
- Unit tests use `// Arrange`, `// Act`, `// Assert` when setup/action/assertion are not trivial
- Integration and E2E tests use `// Given`, `// When`, `// Then` for scenario readability
- DTO, mapper, decorator, and pure util tests may omit structure comments when the test is short and obvious
- Keep each test focused on one behavior; prefer one main assertion group over many unrelated assertions
- Put data builders and mocks in Arrange/Given, execute exactly one behavior in Act/When, verify observable outcome in Assert/Then
- Test only public methods
- Test error conditions and edge cases
- Use expect().toMatchSnapshot() for complex objects when appropriate
- Async/await for promise testing
- BeforeEach/AfterEach for setup/teardown
- Avoid testing private methods directly
- Use spies for tracking function calls
- Reset mocks between tests

### Git Guidelines

- Commit often with descriptive messages
- Use conventional commits format
- Feature branches for new work
- Pull requests for code review
- Rebase before merging when appropriate
- Delete merged branches
- Tag releases with semantic versioning
- Keep main branch deployable
- Write clear PR descriptions
- Link to issues in commits/PRs
- Use .gitignore for generated files
- Don't commit secrets or credentials
- Use .npmrc or environment variables for config
