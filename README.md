# Retail SaaS Backend

Multi-tenant SaaS backend for micro-business storefronts with RAG-powered AI chatbot and file storage.

## Overview

A platform enabling small retail businesses (pet shops, garden centers, etc.) to quickly launch a public storefront with a product catalog and an AI chatbot trained on their business documents.

### Key Features

- **Public Storefront** — product catalog at `platform/shop/:slug`
- **RAG Chatbot** — AI assistant answering customer questions based on uploaded documents
- **Admin Panel API** — shop management, analytics, and knowledge base administration

## Technology Stack

- **Framework**: NestJS (Node.js) + TypeScript
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis (ioredis)
- **Vector Database**: ChromaDB
- **Object Storage**: MinIO S3
- **AI/ML**: LangChain, HuggingFace Transformers, Groq API
- **Auth**: JWT + bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager
- Docker and Docker Compose
- Groq API key (for AI features)

### Installation

```bash
# Clone repository
git clone https://github.com/kovs713/retail-saas-backend.git
cd retail-saas-backend

# Install dependencies
pnpm install

# Copy environment configuration
cp .env.example .env
```

### Database Setup

```bash
# Start infrastructure services
docker-compose up -d

# Verify services are running
docker-compose ps
```

### Running the Application

```bash
# Development mode
pnpm run start:dev

# Production build
pnpm run build
pnpm run start:prod
```

### API Documentation

Swagger UI available at `http://localhost:3000/api` when the application is running.

## Configuration

### Environment Variables

| Variable                 | Description         | Default                 | Required              |
| ------------------------ | ------------------- | ----------------------- | --------------------- |
| `NODE_ENV`               | Environment mode    | development             | No                    |
| `PORT`                   | Application port    | 3000                    | No                    |
| `GROQ_API_KEY`           | Groq AI API key     | -                       | Yes (for AI features) |
| `GROQ_MODEL`             | AI model            | llama-3.3-70b-versatile | No                    |
| `DB_HOST`                | PostgreSQL host     | 127.0.0.1               | No                    |
| `DB_PORT`                | PostgreSQL port     | 5432                    | No                    |
| `DB_USERNAME`            | Database username   | postgres                | No                    |
| `DB_PASSWORD`            | Database password   | postgres                | No                    |
| `DB_DATABASE`            | Database name       | retail_analytics        | No                    |
| `REDIS_HOST`             | Redis host          | 127.0.0.1               | No                    |
| `REDIS_PORT`             | Redis port          | 6379                    | No                    |
| `REDIS_PASSWORD`         | Redis password      | redis                   | No                    |
| `S3_HOST`                | MinIO host          | 127.0.0.1               | No                    |
| `S3_PORT`                | MinIO port          | 9000                    | No                    |
| `S3_USERNAME`            | MinIO username      | admin                   | No                    |
| `S3_PASSWORD`            | MinIO password      | password                | No                    |
| `S3_BUCKET`              | Default S3 bucket   | retail-data             | No                    |
| `VECTOR_COLLECTION_NAME` | ChromaDB collection | documents               | No                    |

### Project Structure

```
src/
├── modules/
│   ├── product/          # Product catalog and categories
│   ├── rag/              # RAG system (embeddings, LLM, vector store)
│   ├── shop/             # Shop profile management
│   ├── storage/          # MinIO S3 file storage
│   └── user/             # User management
├── core/
│   ├── auth/             # JWT authentication and authorization
│   ├── cache/            # Redis caching
│   └── logger/           # Logging service
├── common/               # Shared decorators, DTOs, guards, types
├── database/             # Database configuration, seeds, migrations
├── config/               # Configuration management
├── app.module.ts         # Root application module
└── main.ts               # Entry point (Swagger, CORS, ValidationPipe)

test/
├── unit/                 # Unit tests (*.spec.ts)
├── integration/          # Integration tests (*.integration.spec.ts)
├── e2e/                  # End-to-end tests (*.e2e-spec.ts)
└── __mocks__/            # Jest mocks
```

## License

This project is licensed under the GNU General Public License v3.0.
