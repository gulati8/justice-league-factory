---
name: frontend-patterns
description: >
  Frontend styling, component structure, and UI consistency standards for any
  project. Activate whenever a task involves UI components, buttons, modals,
  forms, tabs, badges, inputs, color choices, inline styles, component
  organization, shared components, API types, file attachments, or any frontend
  code change. Also activate when a new backend field needs frontend consumption.
user-invocable: false
disable-model-invocation: true
---

# Frontend Patterns

This guides frontend code for projects using a component-based framework
(e.g., React) with utility-first CSS (e.g., Tailwind) and a custom design
system. Adapt to the target project's conventions.

## The Styling Hierarchy

### 1. Component Layer Classes

If the project defines reusable component classes (e.g., `@layer components`),
reach for them first. They encode design decisions globally — one edit updates
every instance. Do not rebuild buttons, inputs, or cards from raw utilities.

```tsx
// Right
<button className="btn-primary">Save</button>  <input className="input" />

// Wrong: raw utilities instead of component class
<button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">Save</button>
```

### 2. Theme Utility Classes

Use the project's semantic theme tokens for colors, not the default palette.
Semantic tokens update everywhere when the theme changes; default palette values
silently drift.

Right: `text-surface-600`, `bg-danger-light border border-danger text-danger`.
Wrong: `text-gray-600`, `bg-red-50 border border-red-200 text-red-600`.

### 3. Inline Styles (Last Resort)

Inline `style={{}}` escapes the design system: the theme cannot update it,
TypeScript cannot type-check it. Acceptable only for runtime-computed values
that cannot be expressed as utility classes.

## Component Organization

Shared components (used 2+ places, generic primitives) → `components/`.
Page-specific → `pages/{feature}/`. Field definitions → `constants.ts`.
API entity types → `api/client.ts`. Duplicating JSX is a maintenance trap.

## Modal Pattern

Every modal: backdrop → card → header (title + close) → content → actions.
`max-w-md` for forms, `max-w-lg` for content-heavy modals.

```tsx
{/* backdrop: fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 */}
  {/* card: bg-white rounded-xl max-w-{size} w-full max-h-[90vh] overflow-y-auto */}
    {/* header: flex justify-between items-center — title + close button */}
    {/* content */}
    {/* actions: flex justify-end space-x-3 — btn-secondary cancel + btn-primary confirm */}
```

## Tab Pattern

Tabs follow: state (`showForm`, `editingId`, `deletingId`) + CRUD handlers +
header row (title + "Add") + conditional form (handles both add and edit) +
empty state + `divide-y` list. State is lifted: tabs receive `items` and
`setItems` from the parent. Delete confirmation: "Delete" → "Sure? Yes / No".

## Form Field Definitions

Field definitions belong in `constants.ts`, not inline. Inline arrays tie
config to a single render path and clutter JSX with non-presentation data.

```typescript
// Right: constants.ts
export const TASK_FIELDS: EditField[] = [
  { key: 'title', placeholder: 'Title *', required: true },
  { key: 'priority', type: 'select', options: PRIORITY_OPTIONS },
];
// Wrong: fields array defined inline in the component JSX
```

## API Types

All TypeScript types for API entities live in `frontend/src/api/client.ts`.
Inline types in component files create multiple sources of truth that silently
drift. Props interfaces (`SomeTabProps`) are the exception — they stay in the
component file.

## Error States

```tsx
{error && (
  <div className="mb-4 bg-danger-light border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm">
    {error}
  </div>
)}
```

Do not use `bg-red-50 border-red-200 text-red-600` — these bypass the theme.

## File and Media Attachments

File upload logic belongs in a reusable upload component, not inlined into
feature components. That component owns: file selection, validation, upload
request, progress, and error handling. The attachment metadata type lives in
`client.ts`. Feature components receive completed attachment objects only.

## Detailed Examples

For concrete TSX, TypeScript, and CSS examples using a to-do list application
domain, see [references/component-examples.md](references/component-examples.md).
Use the Read tool to load this file — it is not auto-loaded with the skill.
