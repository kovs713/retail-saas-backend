# Retail SaaS Backend

Multi-tenant SaaS backend for micro-business storefronts with RAG-powered AI chatbot and file storage.

## Overview

A platform enabling small retail businesses (pet shops, garden centers, etc.) to quickly launch a public storefront with a product catalog and an AI chatbot trained on their business documents.

### Key Features

- **Public Storefront** — product catalog at `platform/shop/:slug`
- **RAG Chatbot** — AI assistant answering customer questions based on uploaded documents
- **Admin Panel API** — shop management, analytics, and knowledge base administration
- **Order Management** — create, track, and manage orders
- **Analytics** — storefront views and chat event tracking

## Technology Stack

- **Framework**: NestJS (Node.js) + TypeScript
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis
- **Vector Database**: ChromaDB
- **Object Storage**: MinIO S3
- **AI/ML**: LangChain, Ollama Embeddings, Groq API
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

### Configuration

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
├── common/               # Shared decorators, DTOs, guards, types, utils
├── database/
│   └── seeds/            # Database seeding
├── app.module.ts         # Root application module
└── main.ts               # Entry point (Swagger, CORS, ValidationPipe)

test/
├── http/                 # HTTP request tests (*.http)
└── integration/          # Integration tests
    └── modules/          # Module-specific integration tests
```

## License

This project is licensed under the GNU General Public License v3.0.
