# Database Patterns — Migration Examples

Examples use a to-do list application domain: `tasks`, `task_labels`,
`task_comments`, `users`. All SQL targets PostgreSQL.

## Migration File Template

```typescript
import { pool } from './pool.js';

const migration = `
-- Add priority column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium';
`;

async function migrate() {
  console.log('Running add-priority migration...');
  try {
    await pool.query(migration);
    console.log('Add-priority migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
```

Register in `package.json`:

```json
{
  "db:migrate:add-priority": "node dist/db/migrate-add-priority.js",
  "db:migrate:add-priority:dev": "tsx src/db/migrate-add-priority.ts"
}
```

## Adding a Column

Use `ADD COLUMN IF NOT EXISTS` so the migration is safe to re-run. Always
include a `DEFAULT` or allow `NULL` — the statement fails on non-empty tables
without one.

```sql
-- Right: idempotent, safe default
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium';

-- Right: nullable column, no default needed
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;

-- Wrong: no IF NOT EXISTS, no default — fails if run twice or table has rows
ALTER TABLE tasks ADD COLUMN priority VARCHAR(10) NOT NULL;
```

**Rollback:**

```sql
ALTER TABLE tasks DROP COLUMN IF EXISTS priority;
```

## Adding a Column with Data Backfill

When the column's default isn't sufficient, combine `ALTER` and `UPDATE` in the
same migration so they succeed or fail as a unit.

```sql
-- Add is_overdue flag, then backfill from existing due_date data
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN NOT NULL DEFAULT false;
UPDATE tasks
  SET is_overdue = true
  WHERE due_date < NOW()
    AND is_completed = false
    AND is_overdue = false;
```

**Rollback:**

```sql
ALTER TABLE tasks DROP COLUMN IF EXISTS is_overdue;
```

## Creating a New Table

Use `CREATE TABLE IF NOT EXISTS` for idempotency. Index every foreign key and
every column used in frequent lookups — the query planner needs them.

```sql
CREATE TABLE IF NOT EXISTS task_labels (
  id          SERIAL PRIMARY KEY,
  task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name        VARCHAR(64) NOT NULL,
  color       VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_labels_task_id ON task_labels(task_id);

-- For a junction/association table:
CREATE TABLE IF NOT EXISTS task_label_assignments (
  task_id   INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id  INTEGER NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_task_label_assignments_label_id
  ON task_label_assignments(label_id);
```

**Rollback:**

```sql
DROP TABLE IF EXISTS task_label_assignments;
DROP TABLE IF EXISTS task_labels;
```

## Renaming a Column

`RENAME COLUMN` is not idempotent. Wrap in a `DO $$ ... END $$` block with an
`information_schema.columns` check so the migration is safe to re-run.

```sql
-- Right: idempotent rename
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'description'
  ) THEN
    ALTER TABLE tasks RENAME COLUMN description TO summary;
  END IF;
END $$;

-- Wrong: not idempotent — fails if run twice or column already renamed
ALTER TABLE tasks RENAME COLUMN description TO summary;
```

After the migration, update every layer of the stack (see the full-stack
checklist below) — leaving any layer behind defeats the purpose.

**Rollback:**

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'summary'
  ) THEN
    ALTER TABLE tasks RENAME COLUMN summary TO description;
  END IF;
END $$;
```

## Transforming Existing Data

When a column's semantics change (not just its name), wrap the alter and the
transform in a `DO $$ ... END $$` block so they are atomic.

```sql
-- Split a combined status field into status + archived boolean
DO $$
BEGIN
  -- Add archived column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'archived'
  ) THEN
    ALTER TABLE tasks ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Migrate 'archived' status value into the new boolean column
  UPDATE tasks SET status = 'done', archived = true WHERE status = 'archived';
END $$;
```

**Rollback:** Data transformation rollbacks require restoring the original data.
Document this in the plan and take a backup before running in production:

```sql
-- Partial rollback: re-encode archived=true rows back to status='archived'
UPDATE tasks SET status = 'archived' WHERE archived = true;
ALTER TABLE tasks DROP COLUMN IF EXISTS archived;
```

## Soft Delete

Adding soft delete requires both a migration and query changes. Missing the
query changes defeats soft delete.

**Migration:**

```sql
-- Add deleted_at to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Index for filtering (most queries will add WHERE deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at)
  WHERE deleted_at IS NOT NULL;
```

**Query pattern change** (apply to every query on this table):

```sql
-- Right: filter out soft-deleted rows
SELECT * FROM tasks WHERE user_id = $1 AND deleted_at IS NULL;

-- Wrong: returns deleted rows
SELECT * FROM tasks WHERE user_id = $1;
```

**Soft delete operation:**

```sql
-- Soft delete (never use DELETE for soft-deleted tables)
UPDATE tasks SET deleted_at = NOW() WHERE id = $1;

-- Hard delete (admin only, permanent)
DELETE FROM tasks WHERE id = $1;
```

**Rollback:**

```sql
DROP INDEX IF EXISTS idx_tasks_deleted_at;
ALTER TABLE tasks DROP COLUMN IF EXISTS deleted_at;
```

## Nullable vs Required Fields

Use `NOT NULL` only when the field is always present and meaningful. Use `NULL`
when the field is optional or not yet known.

```sql
-- Required: task always has a title and owner
title    VARCHAR(255) NOT NULL,
user_id  INTEGER NOT NULL REFERENCES users(id),

-- Optional: task may not have a due date or label
due_date  TIMESTAMP,
label_id  INTEGER REFERENCES task_labels(id),

-- Default + NOT NULL: always present, has a sensible initial value
priority    VARCHAR(10) NOT NULL DEFAULT 'medium',
is_completed BOOLEAN NOT NULL DEFAULT false,

-- Wrong: NOT NULL without a default fails on INSERT if caller omits the field
priority VARCHAR(10) NOT NULL,
```

`NULL` means "not applicable" or "not yet known" — use it deliberately. Avoid
empty strings as a substitute for `NULL`; they require special-case handling
everywhere the field is read.

## Full-Stack Checklist Walkthrough

Example: renaming `description` to `summary` on the `tasks` table.

1. **Migration file** — `backend/src/db/migrate-rename-description.ts`
   Contains the idempotent `DO $$` rename block above.

2. **npm scripts** — Add `db:migrate:rename-description` and
   `db:migrate:rename-description:dev` to `backend/package.json`.

3. **TypeScript model interface** — `backend/src/models/task.ts`
   Change `description: string` to `summary: string` in the `Task` interface
   and `CreateTaskInput` type.

4. **SQL queries in model** — `backend/src/models/task.ts`
   Update every `SELECT`, `INSERT`, and `UPDATE` that references `description`:
   ```typescript
   // Before
   const result = await pool.query('SELECT id, title, description FROM tasks WHERE id = $1', [id]);
   // After
   const result = await pool.query('SELECT id, title, summary FROM tasks WHERE id = $1', [id]);
   ```

5. **Zod validation schema** — `backend/src/routes/tasks.ts`
   ```typescript
   // Before
   const createTaskSchema = z.object({ title: z.string(), description: z.string().optional() });
   // After
   const createTaskSchema = z.object({ title: z.string(), summary: z.string().optional() });
   ```

6. **Allowed fields list** — `backend/src/models/task.ts`
   ```typescript
   // Before
   const allowedFields = ['title', 'description', 'priority', 'due_date'];
   // After
   const allowedFields = ['title', 'summary', 'priority', 'due_date'];
   ```

7. **Seed data** — `backend/src/db/seed.ts`
   Update any seed records that set `description` to use `summary` instead.

8. **Frontend API types** — `frontend/src/api/client.ts`
   ```typescript
   // Before
   export interface Task { id: number; title: string; description?: string; }
   // After
   export interface Task { id: number; title: string; summary?: string; }
   ```

9. **Frontend components** — Any component that reads or writes `task.description`:
   ```tsx
   // Before
   <p>{task.description}</p>
   // After
   <p>{task.summary}</p>
   ```

10. **E2E tests** — Page objects and fixture data in `frontend/e2e/`:
    Update any `task.description` references in fixtures, page object methods,
    and locators.

11. **Base schema DDL** — `backend/src/db/migrate.ts` (or equivalent fresh-install
    schema): update the `CREATE TABLE tasks` statement to use `summary` instead
    of `description` so a fresh database setup gets the correct column.
