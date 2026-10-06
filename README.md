# AG Stores

Production-oriented foundation for a retail ordering and delivery management
application. It uses Next.js App Router, strict TypeScript, Tailwind CSS,
shadcn/ui conventions, PostgreSQL, Prisma, and Zod.

No business features are implemented yet.

## Requirements

- Node.js 24 or newer
- npm 11 or newer
- PostgreSQL 16 or newer

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the local environment file:

   ```bash
   cp .env.example .env
   ```

   Delivery maps are disabled by default. To enable Mapbox visualization, set
   `NEXT_PUBLIC_MAP_PROVIDER="mapbox"` and provide a URL-restricted public
   `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` beginning with `pk.`. Never use a Mapbox
   secret token (`sk.*`) in a `NEXT_PUBLIC_*` variable.

3. Update `DATABASE_URL` in `.env`, then generate the Prisma client:

   ```bash
   npm run db:generate
   ```

4. Apply migrations once models have been added:

   ```bash
   npm run db:migrate
   ```

5. Load the idempotent development seed:

   ```bash
   npm run db:seed
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

Open <http://localhost:3000>. The health endpoint is available at
<http://localhost:3000/api/health>.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run format:check
```

Database integration tests require a migrated and seeded PostgreSQL database:

```bash
DATABASE_URL="<test-database-url>" npm run db:migrate:deploy
DATABASE_URL="<test-database-url>" npm run db:seed
TEST_DATABASE_URL="<test-database-url>" npm run test:db
```

See [Database design decisions](docs/database-design.md) for ownership,
precision, indexing, and deletion-policy details.

See [Authentication design](docs/authentication.md) for password, session,
cookie, and authorization decisions.

Playwright requires a Chromium installation. Install it once with:

```bash
npx playwright install chromium
```

CI images that provide their own Chrome can set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to that executable instead.

## Architecture

```text
src/
├── app/           # App Router pages and thin HTTP route adapters
├── components/    # Shared presentation components and shadcn/ui primitives
├── db/            # Lazy database client construction
├── features/      # Feature-owned UI and application modules
├── generated/     # Generated Prisma client (not committed)
├── lib/           # Framework-neutral shared utilities
├── repositories/  # Persistence abstractions and Prisma queries
├── services/      # Application orchestration and business logic
├── types/         # Shared TypeScript types
└── validations/   # Zod schemas and input/environment validation
```

React components focus on presentation. Route handlers translate HTTP requests
and responses. Business rules belong in feature/application services, and only
repositories should contain persistence queries.

The initial locale is English (`en`). User-facing copy should be kept ready for
extraction into translation dictionaries when Sinhala (`si`) is introduced.
