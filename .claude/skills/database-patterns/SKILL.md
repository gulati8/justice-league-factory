---
name: database-patterns
description: >
  Database migration and schema change standards for the FureverCare project.
  Activate this skill whenever a task involves schema changes, column renames,
  field additions, table creation, data backfills, index creation, or any
  modification to how data is stored or named in the database. Also activate
  when reviewing SQL queries that use aliases, or when backend TypeScript
  interfaces need to reflect a new database shape.
user-invocable: false
disable-model-invocation: true
---

# Database Patterns

This guides how you handle any database schema change in the FureverCare
project. The project uses PostgreSQL with raw SQL (no ORM), standalone migration
scripts in `backend/src/db/`, Zod for request validation, and TypeScript
interfaces for data types.

## Migration-First Principles

Migration-first principles are defined in architectural-principles. This skill covers the mechanics: file naming, templates, schema change patterns, and the full-stack checklist.

## Migration File Conventions

Every migration follows a consistent structure so that any developer can read,
run, or roll back a migration without surprises.

### File Naming

```
backend/src/db/migrate-{descriptive-slug}.ts
```

The slug describes what the migration does in kebab-case. Real examples from the
codebase:
- `migrate-weight-units.ts` — adds `weight_unit` column to pets
- `migrate-sex-fixed.ts` — adds `is_fixed` column, migrates existing data
- `migrate-share-tokens.ts` — creates the `share_tokens` table
- `migrate-soft-delete.ts` — adds `deleted_at` columns to document tables
- `migrate-allergy-show-on-card.ts` — adds `show_on_card` to allergies + backfill

### File Structure

Every migration file follows this exact template:

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

Key details:
- Import `pool` from `./pool.js` (note the `.js` extension — this is ESM)
- SQL goes in a template literal assigned to `const migration`
- The `migrate()` function logs before and after, catches errors, and always
  calls `pool.end()` in the `finally` block so the process exits cleanly
- The function is called immediately at module scope

### npm Script Registration

Every migration needs two npm script entries in `backend/package.json` so other
developers can run it without reading the source:

```json
{
  "db:migrate:<slug>": "node dist/db/migrate-<slug>.js",
  "db:migrate:<slug>:dev": "tsx src/db/migrate-<slug>.ts"
}
```

The `:dev` variant uses `tsx` to run TypeScript directly during development.
The production variant runs compiled JS from `dist/`.

## Types of Schema Changes

### Adding a Column

Use `ADD COLUMN IF NOT EXISTS` so the migration is safe to re-run. Always
include a `DEFAULT` value or allow `NULL` — otherwise the statement will fail on
tables with existing rows.

```sql
ALTER TABLE pets ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(3) DEFAULT 'kg';
```

Real example from `migrate-weight-units.ts`: the default ensures existing rows
get a sensible value without a separate backfill step.

### Adding a Column with Data Backfill

When the column's default isn't sufficient and existing data needs updating,
combine the `ALTER` and `UPDATE` in the same migration so they succeed or fail
as a unit.

Real example from `migrate-allergy-show-on-card.ts`:
```sql
ALTER TABLE pet_allergies ADD COLUMN IF NOT EXISTS show_on_card BOOLEAN NOT NULL DEFAULT false;
UPDATE pet_allergies SET show_on_card = true
  WHERE severity IN ('life-threatening', 'severe') AND show_on_card = false;
```

### Adding a New Table

Use `CREATE TABLE IF NOT EXISTS` for idempotency. Always include indexes on
foreign keys and any column used in frequent lookups — the query planner needs
them.

Real example from `migrate-share-tokens.ts`:
```sql
CREATE TABLE IF NOT EXISTS share_tokens (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  token VARCHAR(32) UNIQUE NOT NULL,
  ...
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_share_tokens_pet_id ON share_tokens(pet_id);
```

### Renaming a Column

This is the operation that was done wrong with `special_instructions`. The
migration SQL itself is simple:

```sql
ALTER TABLE pets RENAME COLUMN special_instructions TO owners_notes;
```

`RENAME COLUMN` is not idempotent. If there's any chance the migration might be
run twice (e.g., against different environments), add an existence check:

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'special_instructions'
  ) THEN
    ALTER TABLE pets RENAME COLUMN special_instructions TO owners_notes;
  END IF;
END $$;
```

After the migration, every layer of the stack must be updated (see the
full-stack checklist below). Leaving any layer behind defeats the purpose of the
migration.

### Transforming Existing Data

When a column's semantics change (not just its name), wrap the logic in a
`DO $$ ... END $$` block so the add and the transform are atomic.

Real example from `migrate-sex-fixed.ts`:
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pets' AND column_name = 'is_fixed'
  ) THEN
    ALTER TABLE pets ADD COLUMN is_fixed BOOLEAN DEFAULT FALSE;
  END IF;

  UPDATE pets SET sex = 'male', is_fixed = TRUE WHERE sex = 'neutered_male';
  UPDATE pets SET sex = 'female', is_fixed = TRUE WHERE sex = 'spayed_female';
END $$;
```

This migration adds a new column and transforms existing data in a single
atomic operation.

## Full-Stack Checklist for Schema Changes

A schema change that touches the database but not the application is broken, and
vice versa. Each layer below has a job, and skipping any one creates the kind of
name mismatch this skill exists to prevent.

1. **Migration file** — `backend/src/db/migrate-<slug>.ts`
   The authoritative change. Everything else derives from it.

2. **npm scripts** — both `db:migrate:<slug>` and `db:migrate:<slug>:dev`
   Without these, other developers can't run the migration without reading source.

3. **TypeScript model interface** — `backend/src/models/<entity>.ts`
   The `interface` and `CreateInput` type must reflect the new shape. TypeScript
   will catch downstream consumers that aren't updated.

4. **SQL queries in model** — every `SELECT`, `INSERT`, `UPDATE` that references
   the old column name. A query using the old name will fail at runtime.

5. **Zod validation schema** — `backend/src/routes/<entity>.ts`
   The `z.object({...})` validates incoming request bodies. If it doesn't match
   the new field name, valid requests will be rejected or invalid ones accepted.

6. **Allowed fields list** — the `allowedFields` array in update functions.
   This guards against mass-assignment vulnerabilities. A renamed field not
   updated here will silently fail to update.

7. **Seed data** — `backend/src/db/seed.ts` if the field is seeded.
   Seeding with an old column name will fail on a fresh database setup.

8. **Frontend API types** — `frontend/src/api/client.ts`
   All TypeScript types for API data live here. Updating the backend without
   updating these types breaks the TypeScript contract at the boundary.

9. **Frontend components** — every component that reads or writes the field.
   Components referencing the old field name will either show undefined or fail
   to send the correct payload to the API.

10. **E2E tests** — page objects, fixture data, and test specs that reference
    the old field name. Playwright page objects in `frontend/e2e/pages/` often
    have typed properties and locators that use the column name. Fixture data in
    test specs uses the field name directly. Missing these means tests fail on
    the next CI run.

11. **Base schema DDL** — `backend/src/db/migrate.ts` contains the
    `CREATE TABLE` statements used for fresh installs. If the base schema still
    references the old column name, a fresh database setup (new developer, new
    environment) will create the old column, and then the rename migration will
    either fail or be a no-op depending on order.

## Rollback Strategy

Every rename migration should have a documented reverse operation. For column
renames, the rollback is the inverse `RENAME COLUMN`:

```sql
-- Rollback: reverse the breed_or_mix rename
ALTER TABLE pets RENAME COLUMN breed_or_mix TO breed;
```

Include this as a comment in the migration file or in the plan document. For
destructive migrations (dropping columns, transforming data), the rollback is
more complex and may require a backup-and-restore step — document that
explicitly in the plan.
