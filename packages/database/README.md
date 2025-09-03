# @speechwriter/database

Database layer for the SpeechWriter application using Drizzle ORM with PostgreSQL and pgvector for AI embeddings.

## Features

- ✅ Complete database schema for all core entities
- ✅ PostgreSQL with pgvector extension for vector embeddings
- ✅ Drizzle ORM for type-safe database operations
- ✅ Migration system with rollback support
- ✅ Comprehensive seed data with demo content
- ✅ Database utilities and health checks
- ✅ Connection management optimized for serverless

## Schema Overview

### Core Entities

1. **Users & Auth** - Authentication and user management
2. **Subscriptions & Billing** - Stripe integration for Pro/Team plans
3. **Speeches** - Main speech entities with versioning
4. **Personas** - User speaking styles with stylometry analysis
5. **Stories** - Personal anecdotes with vector search
6. **Humanization** - AI improvement passes with critic feedback
7. **Observability** - Model runs, metrics, and analytics
8. **Collaboration** - Comments, sharing, and permissions

### Key Features

- **Vector Embeddings**: Story search using pgvector for RAG retrieval
- **Versioning**: Complete speech history with rollback capability
- **Analytics**: Track model usage, costs, and performance
- **Permissions**: Row-level security patterns for multi-user access
- **AI Metadata**: Track model versions, prompts, and generation context

## Setup

### 1. Database Configuration

Set up your environment variables:

```bash
# Copy example file
cp .env.example .env

# Add your database URL
DATABASE_URL=postgresql://user:pass@host:port/database
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Database Setup

```bash
# Enable extensions (pgvector, uuid-ossp)
pnpm db:setup

# Generate and run migrations
pnpm db:generate
pnpm db:migrate

# Seed with demo data
pnpm db:seed
```

## Usage

### Basic Connection

```typescript
import { getDb } from '@speechwriter/database';

const db = getDb();
const users = await db.select().from(schema.users);
```

### Query Utilities

```typescript
import { dbUtils } from '@speechwriter/database';

// Get user speeches with versions
const speeches = await dbUtils.getUserSpeeches('user-id');

// Search stories for RAG
const stories = await dbUtils.searchStories('user-id', 'leadership');

// Health check
const status = await dbUtils.healthCheck();
```

### Schema Access

```typescript
import { schemas, eq } from '@speechwriter/database';

// Type-safe queries
const user = await db.select()
  .from(schemas.auth.users)
  .where(eq(schemas.auth.users.id, userId));
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm db:setup` | Enable database extensions |
| `pnpm db:generate` | Generate migration files |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:push` | Push schema changes directly |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Seed with demo data |
| `pnpm db:reset --confirm` | Reset database (DESTRUCTIVE) |
| `pnpm db:reset --truncate-only` | Truncate tables only |

## Demo Data

The seed includes:

### Demo User
- Email: `demo@speechwriter.ai`
- Pro subscription with full features

### Personas (3 presets)
- **Inspirational Leader**: Confident, motivating style
- **Witty MC**: Light-hearted, engaging style  
- **Technical Expert**: Clear, precise style

### Stories (3 examples)
- The Lighthouse Keeper (leadership resilience)
- The Coffee Shop Revelation (learning from failure)
- The Standing Ovation (embracing feedback)

### Sample Speech
- **Title**: "The Future is Built by Those Who Dare to Begin"
- **Type**: 6-minute tech conference keynote
- **Status**: Complete with full outline and analytics

## Database Schema Details

### Tables by Category

**Authentication & Users**
- `users`, `accounts`, `sessions`, `verification_tokens`
- `subscriptions`, `products`, `prices`, `subscription_items`

**Speech Content**
- `speeches`, `speech_sections`, `speech_versions`

**Personalization**
- `personas`, `style_cards`, `stylometry_data`

**Story Vault**
- `stories`, `story_embeddings`, `story_tags`, `story_tag_relations`

**AI Processing**
- `humanization_passes`, `critic_feedback`
- `cliche_analysis`, `cultural_sensitivity_checks`

**Analytics & Observability**
- `model_runs`, `model_metrics`, `telemetry_events`
- `speech_analytics`

**Collaboration**
- `share_links`, `permissions`, `comments`, `suggested_edits`

## Production Considerations

### Performance
- Indexes are automatically created for foreign keys
- Connection pooling configured for serverless
- Query utilities optimized for common operations

### Security
- Row-level security patterns in utilities
- Prepared statements for SQL injection prevention
- Environment-based connection configuration

### Monitoring
- Health check endpoints
- Model run tracking for cost monitoring
- Analytics for user behavior insights

## Development

### Adding New Tables

1. Create schema in `src/schema/`
2. Export from `src/schema/index.ts`
3. Generate migration: `pnpm db:generate`
4. Run migration: `pnpm db:migrate`

### Custom Queries

Use the utilities in `src/utils.ts` as examples for building type-safe queries with proper error handling.

## Support

For database-related issues:
1. Check connection with `pnpm db:setup`
2. Verify migrations with `pnpm db:migrate`
3. Test with health check utilities
4. Review logs for detailed error information