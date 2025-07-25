# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BuildingSafetyAI (BSAI) is an AI-powered document compliance assessment platform for UK Building Safety Regulation Gateway 2 submissions. The system automates document extraction, categorization, and compliance checking against British Standards.

## Development Commands

### Quick Start
```bash
# Start all services (frontend + backend)
./runapp.sh

# Stop all services
./stopapp.sh
```

### Frontend Commands
```bash
# Install dependencies
npm install

# Run development server (port 8080)
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

### Backend Commands (from backend directory)
```bash
# Build backend
cargo build

# Run backend in development mode
cargo run

# Run tests
cargo test

# Run with watch mode for development
cargo watch -x run
```

### Database Commands
```bash
# Setup database
./scripts/setup-db.sh

# Run migrations
./scripts/run-migrations.sh

# Seed test data
./scripts/seed-data.sh

# Test API endpoints
./scripts/test-api.sh

# Additional specialized scripts
./scripts/test-document-processing.sh
./scripts/test-integration.sh
./scripts/seed-assessment-questions.sh
```

### Debugging Commands
```bash
# Backend development with auto-reload
./scripts/dev-backend.sh
cargo watch -x run

# Manual backend build/run
cargo build
cargo run

# Specific testing
cargo test
cargo test api::tests
cargo test -- --nocapture

# Database direct access
psql postgresql://pgadmin:Dell5100@localhost/bsaidb

# Redis operations (if needed)
./scripts/start-redis.sh
```

## Architecture

### Current Implementation

**Frontend Stack:**
- React 18 + TypeScript + Vite
- Tailwind CSS + Shadcn UI components (50+ components)
- React Router v6 for routing
- React Query (TanStack Query) for state management
- React Hook Form + Zod for form validation
- Axios for API communication

**Backend Stack:**
- Rust with Actix-web 4.x framework
- PostgreSQL 17 with SQLx for database operations
- JWT-based authentication with bcrypt
- Local filesystem storage (S3 integration planned)

### Project Structure

```text
BuildingSafetyAI/
├── backend/              # Rust backend
│   ├── src/
│   │   ├── api/         # API route handlers
│   │   ├── models/      # Database models
│   │   ├── services/    # Business logic
│   │   ├── middleware/  # Auth, logging, etc.
│   │   └── db/         # Database connection
│   ├── migrations/      # SQL migration files
│   └── tests/          # Integration tests
├── src/                 # React frontend
│   ├── components/
│   │   ├── dashboard/   # Dashboard components
│   │   ├── layout/      # AppLayout, Sidebar, TopNav
│   │   ├── project/     # Document processing
│   │   └── ui/         # Shadcn UI components
│   ├── pages/          # Route pages
│   ├── contexts/       # React contexts (AuthContext)
│   ├── hooks/          # Custom React hooks
│   └── lib/
│       ├── api/        # API client modules
│       └── utils/      # Utilities
├── scripts/            # Development scripts
├── storage/            # Document storage
└── logs/              # Application logs
```

### Backend Architecture

**Service Layer Architecture:**
- **Layered Design**: API → Service → Model → Database with clear separation of concerns
- **Worker Pool System**: Multi-threaded background processing with specialized workers (Document, API, General)
- **Job Queue**: PostgreSQL-backed distributed job system with `SKIP LOCKED` for contention-free processing
- **Authentication**: JWT with company-scoped permissions and role-based access control
- **Database**: SQLx with compile-time query verification, dynamic query building, and connection pooling
- **Caching**: Redis integration with intelligent invalidation patterns and TTL-based expiration
- **Error Handling**: Custom `AppError` enum with automatic HTTP status mapping and retry logic

**Key Services:**
- `DocumentService`: Complex pagination, metadata management, file processing
- `AssessmentService`: AI-powered compliance evaluation with batch processing
- `JobQueueService`: Distributed background jobs with health monitoring and metrics
- `LLMService`: Claude AI integration with rate limiting and retry mechanisms

### Frontend Architecture

**Component Organization:**
- **Feature-based Structure**: Components organized by domain (auth, companies, projects, dashboard)
- **Shadcn UI System**: 50+ components following design system with CSS variables theming
- **Layout Composition**: AppLayout wrapper for all protected routes with sidebar navigation
- **Dialog Patterns**: Consistent CRUD operations using dialog-based forms

**State Management:**
- **React Query**: Server state management (though not fully utilized - components call API directly)
- **Context**: Authentication context only - minimal client-side state
- **Form State**: React Hook Form + Zod validation with immediate feedback

**Data Flow:**
- **Direct API**: Components call modular API client methods directly
- **Axios Client**: Centralized HTTP client with interceptors for auth and error handling
- **Multi-tenant**: Company-scoped data access with role-based UI rendering

### Key Implementation Details

1. **Path Aliases**: Use `@/` for imports from `src/` directory
2. **Component Pattern**: All UI components follow Shadcn patterns with `cn()` utility for class merging
3. **API Architecture**: All database operations must go through the Rust API - no direct database access from frontend
4. **TypeScript**: Currently configured with loose settings (no strict null checks, allowing flexible development)
5. **Authentication Flow**: JWT tokens in localStorage with 401 interceptors redirecting to login
6. **Worker Architecture**: Background jobs handled by specialized worker pools with semaphore-based rate limiting

## Database Configuration

### Connection Details
- **Host**: localhost
- **Username**: pgadmin
- **Password**: Dell5100
- **Database**: bsaidb
- **Connection String**: `postgresql://pgadmin:Dell5100@localhost/bsaidb`

### PostgreSQL Version & Tools
- **Version**: PostgreSQL 17.5 (Homebrew)
- **Tools Available**:
  - `psql`: Command-line client at `/opt/homebrew/opt/postgresql@17/bin/psql`
  - `postgres`: Server binary at `/opt/homebrew/opt/postgresql@17/bin/postgres`
  - `pg_dump`: Backup utility at `/opt/homebrew/opt/postgresql@17/bin/pg_dump`
  - `pg_restore`: Restore utility at `/opt/homebrew/opt/postgresql@17/bin/pg_restore`

### Core Tables
- `companies` - Multi-tenant company management
- `users` - User accounts with role-based access
- `projects` - Building projects per company
- `documents` - Uploaded documents with versioning
- `evaluations` - AI compliance assessments
- `document_categories` - Document classification

## Application URLs

When running with `./runapp.sh`:
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001/api
- **Login**: admin@bsai.com / admin123!

## Document Storage System

Documents are stored in a hierarchical filesystem:

```text
/storage/
├── companies/
│   └── {company_id}/
│       └── projects/
│           └── {project_id}/
│               └── documents/
│                   └── {document_uid}.{extension}
│                       └── versions/
│                           ├── v1_{document_uid}.{extension}
│                           └── v2_{document_uid}.{extension}
```

- Documents stored using UUID filenames
- Original filenames preserved in database
- Version tracking with v1_, v2_ prefixes
- Metadata stored in JSON files at each level

## LLM Configuration

### Claude Model Integration

**LATEST CLAUDE MODELS** for BuildingSafetyAI:

#### Primary Model - Claude Sonnet 4
- **Model ID**: `claude-sonnet-4-20250514` (Latest version - REQUIRED)
- **Context Window**: 200,000 tokens
- **Max Output**: 64,000 tokens
- **Pricing**: $3/MTok input, $15/MTok output
- **Best For**: High-performance document analysis with excellent reasoning
- **Features**: Text and image input, multilingual support
- **Training cutoff**: March 2025

#### Alternative Model - Claude Opus 4
- **Model ID**: `claude-opus-4-20250514` (Most capable model)
- **Context Window**: 200,000 tokens
- **Max Output**: 32,000 tokens  
- **Pricing**: $15/MTok input, $75/MTok output
- **Best For**: Complex compliance analysis requiring maximum intelligence
- **Note**: Higher cost but superior capability for difficult cases
- **Training cutoff**: March 2025

**Configuration**:
- **API Key**: Configure ANTHROPIC_API_KEY in backend `.env`
- **Usage**: Document compliance evaluation and analysis
- **IMPORTANT**: Always use these exact model versions - do not use older versions

These are the latest Claude models as of 2025. Do not use older model versions like claude-3-opus or claude-3.5-sonnet.

## Testing Strategy

### Backend Testing
```bash
# Run all tests
cargo test

# Run specific test module
cargo test api::tests

# Run with output
cargo test -- --nocapture
```

### Frontend Testing
```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

Target: Minimum 80% code coverage for backend

## API Development

1. **RESTful Design**: Follow REST conventions with proper HTTP status codes
2. **Error Handling**: Comprehensive error responses with consistent format
3. **Validation**: Input validation at both API and database levels
4. **Authentication**: JWT tokens in httpOnly cookies with refresh rotation
5. **Testing**: Unit tests for services, integration tests for endpoints

## Common Development Tasks

### Adding a New API Endpoint
1. Define route in `backend/src/api/routes.rs`
2. Create handler in appropriate module under `backend/src/api/`
3. Add service logic in `backend/src/services/`
4. Write tests alongside implementation
5. Update API documentation

### Adding a New Frontend Component
1. Create component in appropriate directory under `src/components/`
2. Follow Shadcn UI patterns for consistency
3. Use TypeScript interfaces for props
4. Import using `@/` alias
5. Add to parent component or route

### Database Schema Changes
1. Create migration file: `sqlx migrate add <description>`
2. Write migration SQL in generated file
3. Run migration: `sqlx migrate run`
4. Update corresponding Rust models
5. Run tests to ensure compatibility

### Working with Background Jobs
1. **Job Types**: `document_assessment`, `batch_assessment`, `report_generation`
2. **Worker Configuration**: 3 worker types (Document, API, General) with configurable concurrency
3. **Job Creation**: Use `JobQueueService::create_job()` with priority and payload
4. **Monitoring**: Jobs have status tracking (queued, running, completed, failed)
5. **Testing**: Use `./scripts/test-document-processing.sh` to verify job processing

### LLM Integration Development
1. **Models**: Configure in admin panel - currently uses Claude Sonnet 4
2. **API Keys**: Set `ANTHROPIC_API_KEY` in backend `.env` file
3. **Rate Limiting**: Controlled via `max_concurrent_api_calls` per model
4. **Testing**: Use `./scripts/test-quick-processing.sh` for end-to-end testing
5. **Retry Logic**: Automatic exponential backoff with jitter for failed API calls

## Current Implementation Status (July 25, 2025)

**Fully Implemented:**
- Complete frontend application with React + TypeScript + Tailwind CSS
- Full backend API with Rust/Actix-web and PostgreSQL
- Multi-tenant authentication and authorization system
- Company and project management with role-based access
- Document upload with hierarchical storage and versioning
- Document categorization with 107 regulatory assessment questions
- Multi-provider LLM integration (Claude Sonnet 4, GPT-4.1 Mini)
- AI-powered document compliance analysis with robust error handling
- Weighted compliance scoring system (compliant=100%, partially_compliant=50%, excludes not_applicable)
- Assessment progress tracking and real-time updates
- Document review interface with detailed assessment results
- Token usage tracking and cost calculation for all LLM API calls
- PDF document preview and extraction functionality

**Recently Enhanced (July 25, 2025):**
- Fixed compliance score calculation to properly weight different compliance levels
- Implemented comprehensive error handling for LLM requests with retry logic
- Added assessment selection logic to prefer completed assessments over pending ones
- Enhanced token tracking to capture every LLM call for cost analysis
- Fixed assessment data loading issues in the review modal
- Implemented foreign key constraints to preserve history on deletion

**Remaining Items:**
- Enhanced Token Usage dashboard with detailed logs table
- Per-company and per-project cost reporting
- Cost alerts and budget tracking features
- S3 storage migration (currently using local filesystem)
- Email notification system
- Advanced analytics and reporting dashboard