---
name: database-patterns
description: >
  Database migration and schema change standards for the FureverCare project.
  Enforces proper migration-based schema evolution, prevents SQL aliasing hacks,
  and codifies the project's existing migration conventions. Injected into
  Martian Manhunter and Cyborg contexts.
user-invocable: false
disable-model-invocation: true
---

# Database Patterns

This guides how you handle any database schema change in the FureverCare project.
The project uses PostgreSQL with raw SQL (no ORM), standalone migration scripts
in `backend/src/db/`, Zod for request validation, and TypeScript interfaces for
data types. Every schema change MUST follow the patterns below.

## The Cardinal Rule

**Schema changes MUST be database migrations. NEVER use SQL aliases, column
mappings, or application-layer field renaming to avoid changing the actual
database schema.**

Bad (what was done with `special_instructions`):
```sql
-- NEVER DO THIS: aliasing a column to avoid a migration
SELECT special_instructions AS owners_notes FROM pets
```
This creates hidden tech debt. The DB column still has the old name. Every
developer who reads the code is confused. Queries, indexes, and backups all
reference a name that no longer matches the application's vocabulary.

Good:
```sql
-- A proper migration that renames the column
ALTER TABLE pets RENAME COLUMN special_instructions TO owners_notes;
```
Then update every reference in the codebase: TypeScript interfaces, Zod schemas,
SQL queries, API request/response shapes, and frontend types.

## Migration File Conventions

The project has an established pattern. Every migration follows this structure
exactly.

### File Naming

```
backend/src/db/migrate-{descriptive-slug}.ts
```

The slug describes what the migration does in kebab-case. Real examples from the
codebase:
- `migrate-weight-units.ts` -- adds `weight_unit` column to pets
- `migrate-sex-fixed.ts` -- adds `is_fixed` column, migrates existing data
- `migrate-share-tokens.ts` -- creates the `share_tokens` table
- `migrate-soft-delete.ts` -- adds `deleted_at` columns to document tables
- `migrate-allergy-show-on-card.ts` -- adds `show_on_card` to allergies + backfill

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

Key rules:
- Import `pool` from `./pool.js` (note the `.js` extension -- this is ESM)
- SQL goes in a template literal assigned to `const migration`
- The `migrate()` function logs before and after, catches errors, and ALWAYS
  calls `pool.end()` in the `finally` block
- The function is called immediately at module scope

### npm Script Registration

Every migration MUST have two npm script entries in `backend/package.json`:

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

Use `ADD COLUMN IF NOT EXISTS` for idempotency. Always include a `DEFAULT` value
or allow `NULL`.

```sql
ALTER TABLE pets ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(3) DEFAULT 'kg';
```

Real example from `migrate-weight-units.ts`: adds `weight_unit` with a default
so existing rows get a value.

### Adding a Column with Data Backfill

When the new column's default isn't sufficient and existing data needs updating,
combine the ALTER and UPDATE in the same migration.

Real example from `migrate-allergy-show-on-card.ts`:
```sql
ALTER TABLE pet_allergies ADD COLUMN IF NOT EXISTS show_on_card BOOLEAN NOT NULL DEFAULT false;
UPDATE pet_allergies SET show_on_card = true
  WHERE severity IN ('life-threatening', 'severe') AND show_on_card = false;
```

### Adding a New Table

Use `CREATE TABLE IF NOT EXISTS` for idempotency. Always include indexes.

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

This is the operation that was done WRONG with `special_instructions`. Here is
how to do it correctly:

1. Write a migration that uses `ALTER TABLE ... RENAME COLUMN`
2. Update the TypeScript interface in the model file (`backend/src/models/*.ts`)
3. Update every SQL query that references the old column name
4. Update the Zod validation schema in the route file (`backend/src/routes/*.ts`)
5. Update the frontend API client types (`frontend/src/api/client.ts`)
6. Update every frontend component that references the old field name

The migration SQL:
```sql
ALTER TABLE pets RENAME COLUMN special_instructions TO owners_notes;
```

NEVER use `DO $$ BEGIN ... IF NOT EXISTS` guard for renames -- `RENAME COLUMN`
is not idempotent. If you need idempotency, check for the column name first:

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

### Transforming Existing Data

When a column's semantics change (not just its name), wrap the logic in a
`DO $$ ... END $$` block.

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

This migration both adds a new column AND transforms existing data in a single
atomic operation.

## Full-Stack Checklist for Schema Changes

When Martian Manhunter plans a schema change, the plan MUST include tasks
covering ALL of these layers. When Cyborg implements, verify each one:

1. **Migration file** -- `backend/src/db/migrate-<slug>.ts`
2. **npm scripts** -- both `db:migrate:<slug>` and `db:migrate:<slug>:dev`
3. **TypeScript model interface** -- `backend/src/models/<entity>.ts` (the `interface` and `CreateInput`)
4. **SQL queries in model** -- every `SELECT`, `INSERT`, `UPDATE` that references the old name
5. **Zod validation schema** -- `backend/src/routes/<entity>.ts` (the `z.object({...})`)
6. **Allowed fields list** -- the `allowedFields` array in update functions
7. **Seed data** -- `backend/src/db/seed.ts` if the field is seeded
8. **Frontend API types** -- `frontend/src/api/client.ts`
9. **Frontend components** -- every component that reads or writes the field

Missing any layer creates a mismatch between what the database calls the field
and what the application calls it -- which is exactly the kind of hidden debt
this skill exists to prevent.

## What NOT to Do

- NEVER use `SELECT old_name AS new_name` to rename a field at the query level
- NEVER add translation/mapping logic in the API layer to bridge old DB names to new API names
- NEVER leave the database column with an old name while the rest of the stack uses a new name
- NEVER write a migration that deletes data without a corresponding backfill or archive step
- NEVER add a column without considering what happens to existing rows (default value or backfill)
- NEVER skip the npm script registration -- other developers need to run the migration
