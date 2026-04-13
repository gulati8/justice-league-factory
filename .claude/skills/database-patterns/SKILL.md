---
name: database-patterns
description: >
  Database migration and schema change standards for any project using raw SQL
  migrations. Activate whenever a task involves schema changes, column renames,
  field additions, table creation, data backfills, index creation, or any
  modification to how data is stored. Also activate when backend TypeScript
  interfaces need to reflect a new database shape.
user-invocable: false
disable-model-invocation: true
---

# Database Patterns

This guides how you handle any database schema change. The patterns assume
PostgreSQL with raw SQL migrations — no ORM. Adapt file paths to the target
project's conventions.

## Migration-First Principles

Migration-first principles are defined in architectural-principles. This skill
covers the mechanics: file naming, templates, schema change patterns, and the
full-stack checklist.

## Migration File Conventions

### File Naming

```
backend/src/db/migrate-{descriptive-slug}.ts
```

The slug describes what the migration does in kebab-case: `migrate-add-priority.ts`,
`migrate-soft-delete.ts`, `migrate-rename-description.ts`.

### File Structure

Every migration file follows this template:

```typescript
import { pool } from './pool.js';

const migration = `
-- Comment explaining what this migration does
<SQL statements here>
`;

async function migrate() {
  console.log('Running <descriptive name> migration...');
  try {
    await pool.query(migration);
    console.log('<Descriptive name> migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
```

Import `pool` from `./pool.js` (ESM). SQL in a template literal. Always call
`pool.end()` in the `finally` block.

### npm Script Registration

```json
{
  "db:migrate:<slug>": "node dist/db/migrate-<slug>.js",
  "db:migrate:<slug>:dev": "tsx src/db/migrate-<slug>.ts"
}
```

## Schema Change Type Catalog

- **Add column** — `ADD COLUMN IF NOT EXISTS` with `DEFAULT` or `NULL`; fails
  on non-empty tables without one
- **Add with backfill** — combine `ALTER TABLE` + `UPDATE` in one migration;
  succeed or fail as a unit
- **New table** — `CREATE TABLE IF NOT EXISTS`; index every foreign key and
  frequent-lookup column
- **Rename column** — `RENAME COLUMN` is not idempotent; wrap in
  `DO $$ ... END $$` with `information_schema.columns` existence check
- **Transform data** — wrap `ALTER TABLE` + `UPDATE` in `DO $$ ... END $$`
  so add and transform are atomic
- **Soft delete** — add `deleted_at TIMESTAMP` with index; update all queries
  for the table to filter `WHERE deleted_at IS NULL` (both steps required)

## Full-Stack Checklist for Schema Changes

1. **Migration file** — `backend/src/db/migrate-<slug>.ts` — the authoritative change
2. **npm scripts** — both `db:migrate:<slug>` and `db:migrate:<slug>:dev`
3. **TypeScript model interface** — `backend/src/models/{entity}.ts` — `interface` and `CreateInput` type
4. **SQL queries in model** — every `SELECT`, `INSERT`, `UPDATE` referencing the old column name
5. **Zod validation schema** — `backend/src/routes/{entity}.ts` — the `z.object({...})` for request bodies
6. **Allowed fields list** — the `allowedFields` array in update functions (mass-assignment guard)
7. **Seed data** — `backend/src/db/seed.ts` if the field is seeded
8. **Frontend API types** — `frontend/src/api/client.ts` — TypeScript types for API data
9. **Frontend components** — every component that reads or writes the field
10. **E2E tests** — page objects, fixture data, and test specs referencing the old field name
11. **Base schema DDL** — `CREATE TABLE` statements used for fresh installs

## Rollback Strategy

Document a reverse operation for every migration. Column rename rollback: the
inverse `RENAME COLUMN`. Column addition rollback: `DROP COLUMN IF EXISTS`.
Destructive migrations may require backup-and-restore — document that in the
plan. Include rollback SQL as a comment in the migration file.

## Detailed Examples

For concrete SQL and TypeScript examples using a to-do list application domain,
see [references/migration-examples.md](references/migration-examples.md). Use
the Read tool to load this file — it is not auto-loaded with the skill.
