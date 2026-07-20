# Retail Rag Chatbot Backend

Multi-tenant retail rag chatbot SaaS backend with Evotor POS integration, RAG AI chatbot, order management, and file storage.

## Features

- **Public Storefront** — product catalog at `platform/shop/:slug`
- **Evotor POS Integration** — bidirectional product/order sync via API bridge
- **RAG Chatbot** — AI assistant answering customer questions based on catalog + uploaded docs (LangChain + ChromaDB + Groq/Ollama)
- **Self-Service Registration** — shop registration with admin approval workflow
- **Admin Panel API** — cross-tenant metrics, user management, registration approvals
- **Order Management** — create, track, manage orders with inventory tracking
- **Analytics** — storefront views, chat events, revenue, shop growth metrics
- **File Storage** — MinIO S3-based image and document storage
- **Real-time** — WebSocket-based streaming chat
- **Multi-tenant** — isolated data per shop

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS + TypeScript |
| Database | PostgreSQL + TypeORM |
| Cache | Redis |
| Vector DB | ChromaDB |
| Object Storage | MinIO S3 |
| AI | LangChain, Groq, Ollama |
| Auth | JWT + bcryptjs |
| Real-time | Socket.IO |

## Quick Start

```bash
pnpm install
cp .env.example .env
docker-compose up -d          # postgres, redis, chromadb, minio, ollama
pnpm run start:dev
```

Swagger UI at `http://localhost:3000/api`.

## Testing

```bash
pnpm run test                 # unit tests
pnpm run test:integration     # integration (testcontainers)
pnpm run test:e2e             # end-to-end
pnpm run test:cov             # coverage
```

## Project Structure

```
src/
├── modules/
│   ├── admin/                # Admin dashboard + user management
│   ├── analytics/            # Views, chat events, revenue tracking
│   ├── doc-preprocessor/     # External doc preprocessing proxy
│   ├── evotor/               # Evotor POS integration bridge
│   ├── order/                # Order lifecycle + inventory
│   ├── product/              # Catalog, categories, images
│   ├── rag/                  # RAG engine (embeddings, LLM, vector store)
│   ├── registration-application/  # Self-service registration + approval
│   ├── shop/                 # Tenant/shop management + storefront
│   └── user/                 # Identity and auth CRUD
├── core/
│   ├── auth/                 # JWT authentication + guards
│   ├── cache/                # Redis caching service
│   ├── database/             # TypeORM config, migrations, seeds
│   ├── logger/               # Logging service
│   └── object-storage/       # S3-compatible storage abstraction
├── common/                   # Shared decorators, DTOs, guards, pipes, types, utils
├── app.module.ts
└── main.ts

test/
├── e2e/
└── integration/
    └── modules/
```

## License

GNU General Public License v3.0
