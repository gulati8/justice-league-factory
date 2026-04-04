---
name: frontend-patterns
description: >
  Frontend styling, component structure, and UI consistency standards for the
  FureverCare project. Activate this skill whenever a task involves UI
  components, buttons, modals, forms, tabs, badges, inputs, color choices,
  Tailwind classes, inline styles, component organization, shared components,
  API types, or any frontend code change. Also activate when a new field is
  added to a backend model and the frontend needs to consume it.
user-invocable: false
disable-model-invocation: true
---

# Frontend Patterns

This guides how you write frontend code in the FureverCare project. The project
uses React 18, Vite, React Router 6, and Tailwind CSS 3 with a custom theme.
There is no component library — all components are custom. The design system is
defined through Tailwind config tokens and component layer classes in
`frontend/src/index.css`.

## The Styling Hierarchy

There are three layers of styling in this project. Understanding why each layer
exists makes it clear which one to use.

### 1. Component Layer Classes

The project defines reusable classes in `@layer components` in `index.css`.
These classes encode the design decisions that apply consistently across the
entire application: what a button looks like, what an input looks like, what a
card looks like. When you use them, every instance of that element stays in sync
automatically. When the designer changes the primary button style, one edit in
`index.css` updates every button everywhere.

Reach for these classes first, every time they exist.

**Buttons:** The component classes handle all button variants. Building a button
from raw Tailwind utilities instead creates a one-off that won't track design
changes and won't look consistent with the rest of the app.

| Class | Use For |
|-------|---------|
| `.btn-primary` | Primary actions (submit, save, confirm) |
| `.btn-secondary` | Secondary actions (cancel, back) |
| `.btn-accent` | Interactive/secondary CTA (steel blue) |
| `.btn-coral` | Warm accent CTA |
| `.btn-danger` | Destructive actions (delete, remove) |
| `.btn-ghost` | Minimal chrome actions |
| `.btn-sm` | Add to any button class for small variant |

```tsx
// Right
<button className="btn-primary">Save Changes</button>
<button className="btn-secondary btn-sm">Cancel</button>
<button className="btn-danger">Delete Pet</button>
```

```tsx
// Wrong: rebuilding button styles from raw utilities
<button className="bg-navy text-white px-6 py-3 rounded-lg font-semibold">Save</button>
<button className="bg-[#1B2A4A] text-white px-4 py-2 rounded">Submit</button>
```

**Inputs:** Use `.input` for text inputs, textareas, and selects. Use `.label`
for form labels. These classes ensure consistent focus rings, border styles, and
spacing across all forms.

```tsx
<label className="label">Pet Name</label>
<input className="input" type="text" />
<select className="input">...</select>
<textarea className="input" rows={3} />
```

**Date inputs:** The project has a `FlexibleDateInput` component
(`components/FlexibleDateInput.tsx`) that handles date entry with precision
tracking (day, month, year). When a form includes a date field, use
`FlexibleDateInput` instead of a raw `<input type="date">`. This component
pairs a date value with a `date_precision` field so the app can display "March
2025" vs "March 15, 2025" appropriately. Use `formatFlexibleDate()` from the
same module when displaying dates.

**Other available component classes:**
- `.card` — white background card with border and hover shadow
- `.badge`, `.badge-danger`, `.badge-warning`, `.badge-success`, `.badge-info`, `.badge-navy` — status badges
- `.status-dot`, `.status-dot-success`, etc. — inline status indicators
- `.breadcrumb` — breadcrumb navigation
- `.data-table` — table styling
- `.error-text` — form error messages

### 2. Tailwind Theme Utilities

For spacing, layout, typography sizing, and responsive design, use standard
Tailwind utilities. For colors, use the project's Tailwind theme tokens.

The theme tokens exist so that a color change in one place updates everywhere.
If you use `text-gray-600` instead of `text-surface-600`, that element won't
respond to a theme update and will silently drift out of sync with the rest of
the design. The same applies to using default Tailwind reds and greens instead
of the semantic `danger`, `success`, and `info` tokens.

The theme is defined in `frontend/tailwind.config.js`:

| Token | Tailwind Class | Use For |
|-------|---------------|---------|
| Navy | `text-navy`, `bg-navy`, `border-navy` | Primary brand, headings, primary buttons |
| Navy light | `text-navy-light`, `bg-navy-light` | Hover states |
| Navy 50 | `bg-navy-50` | Light navy backgrounds |
| Steel | `text-steel`, `bg-steel` | Secondary interactive, links |
| Steel light | `bg-steel-light` | Light blue backgrounds |
| Coral | `text-coral`, `bg-coral` | Warm accent, CTAs |
| Danger | `text-danger`, `bg-danger`, `bg-danger-light` | Errors, destructive |
| Warning | `text-warning`, `bg-warning-light` | Warnings, alerts |
| Success | `text-success`, `bg-success-light` | Success states |
| Info | `text-info`, `bg-info-light` | Informational |
| Surface 100-700 | `text-surface-500`, `bg-surface-100` | Grays, backgrounds, borders |

```tsx
// Right
<p className="text-surface-600 text-sm">Secondary text</p>
<div className="bg-danger-light border border-danger rounded-lg p-4">Error message</div>
<span className="text-navy font-semibold">Important label</span>
```

```tsx
// Wrong: default Tailwind palette instead of theme tokens
<p className="text-gray-600">Secondary text</p>
<span className="text-red-600">Error</span>
<div className="bg-red-50 border border-red-200 text-red-600">Error box</div>
```

Quick reference for the most common substitutions:
- `text-gray-400` → `text-surface-400`
- `text-gray-500` → `text-surface-500`
- `text-gray-600` → `text-surface-600`
- `text-gray-900` → `text-navy`
- `bg-gray-50` → `bg-surface` or `bg-surface-100`
- `border-gray-200` → `border-surface-200`
- `text-red-600` / `text-red-700` → `text-danger`
- `bg-red-50` / `bg-red-100` → `bg-danger-light`
- `text-green-500` → `text-success`
- `text-blue-400` / `hover:border-blue-400` → `text-steel` / `hover:border-steel`

The existing codebase has violations of this rule (e.g., `text-gray-500`,
`text-red-600`, `bg-red-100` in tab components). Don't propagate these mistakes.
New code should use theme tokens. When modifying an existing file, convert color
classes you touch to theme tokens, but don't refactor the entire file — stay
within your task scope.

### 3. Inline Styles (Last Resort)

Inline `style={{}}` with CSS variable references or hardcoded values is the
worst pattern in the codebase because it escapes the design system entirely. The
theme can't update it, TypeScript can't type-check it, and Tailwind's purging
can't reason about it.

Bad examples that exist in the codebase — do not copy these:
```tsx
// Wrong: inline style with CSS variables
<h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-navy)' }}>
// Wrong: hardcoded rgba
<div style={{ background: 'rgba(27,42,74,0.5)' }}>
// Wrong: hardcoded hex in SVG
<rect fill="#1B2A4A"/>
<circle fill="#4A7FB5"/>
```

These appear in `AuthModal.tsx`, `EmergencyCard.tsx`, `OverviewSection.tsx`, and
`Footer.tsx`. They are tech debt. Don't add more.

The only acceptable use of inline `style` is for values that must be computed at
runtime (e.g., a width based on a percentage). Even then, prefer Tailwind's
arbitrary value syntax: `w-[${percent}%]`.

## Component Organization

### File Structure

```
frontend/src/
  components/           # Shared components used across multiple pages
    InlineEditForm.tsx   # Generic inline editing (used by all tabs)
    FlexibleDateInput.tsx
    SourceDocumentLink.tsx
    EmergencyCard.tsx
    PhotoUpload.tsx
    SpeciesAvatar.tsx
    ...Modal.tsx         # Modals live here as shared components
  pages/
    Dashboard.tsx
    pet-profile/
      constants.ts       # Field definitions, select options, shared config
      utils.ts           # Formatting helpers
      PetProfileNav.tsx  # Navigation component specific to pet profile
      EmergencyCardPreview.tsx
      sections/          # Major sections of the profile page
        OverviewSection.tsx
        HealthRecordsSection.tsx
        CareTeamSection.tsx
        DocumentsSection.tsx
        ActivitySection.tsx
      tabs/              # Individual data tabs within sections
        OverviewTab.tsx
        AllergiesTab.tsx
        ConditionsTab.tsx
        MedicationsTab.tsx
        VaccinationsTab.tsx
        VetsTab.tsx
        ContactsTab.tsx
        AlertsTab.tsx
        ImagesTab.tsx
  api/
    client.ts            # API client + ALL TypeScript types
  hooks/
    useAuth.tsx
```

### When to Create a Shared Component

If a UI pattern is used in two or more places, or represents a generic primitive
(modal, form input, avatar), it belongs in `components/`. If it's specific to
one page feature, it belongs in `pages/<page>/`.

Duplicating JSX across tabs is a maintenance trap: when the design changes, every
copy has to be found and updated. The project already handles this well with
`InlineEditForm` and `SourceDocumentLink` — follow that lead.

### Modal Pattern

Every modal in the project follows this structure:

```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
  <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
    <div className="p-6">
      {/* Header with title and close button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Modal Title</h2>
        <button onClick={onClose} className="text-surface-400 hover:text-surface-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      ...

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button className="btn-primary">Confirm</button>
      </div>
    </div>
  </div>
</div>
```

Real examples: `AddPetModal.tsx`, `ShareModal.tsx`, `CardAlertsModal.tsx`.

The backdrop (`fixed inset-0 bg-black bg-opacity-50 ... z-50`), the card
(`bg-white rounded-xl max-w-{size} w-full`), the close button SVG, and the
action button classes are all consistent across every modal. Copy this structure
exactly rather than improvising — consistency is what makes the app feel like a
single product. Max width varies: `max-w-md` for forms, `max-w-lg` for
content-heavy modals.

### Tab Pattern

Tabs within the pet profile follow this established pattern (see `AllergiesTab`,
`ConditionsTab`, `VaccinationsTab`):

```tsx
export default function SomeTab({ petId, token, items, setItems }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // CRUD handlers...

  return (
    <div>
      {/* Header with title and add button */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Tab Title</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          + Add Item
        </button>
      </div>

      {/* Add form (InlineEditForm) */}
      {showForm && <InlineEditForm ... />}

      {/* Empty state */}
      {items.length === 0 ? (
        <p className="text-surface-500 text-center py-8">No items recorded</p>
      ) : (
        <ul className="divide-y">
          {items.map(item => (
            <li key={item.id} className="py-3">
              {/* Inline edit or display */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

Key details:
- State is lifted: the tab receives `items` and `setItems` from the parent
- Field definitions live in `constants.ts`, not inline in the tab
- `InlineEditForm` handles both add and edit (reused, not duplicated)
- Delete has a confirmation pattern: click "Delete" → shows "Sure? Yes No"
- Use `divide-y` for list item separation, not manual borders

### Form Field Definitions

Field definitions for `InlineEditForm` belong in the `constants.ts` file for
the relevant page. Putting them inline in a component ties the configuration to
a single render path, makes them impossible to reuse, and clutters JSX with data
that isn't presentation logic.

```typescript
// Right: in constants.ts
export const ALLERGY_FIELDS: EditField[] = [
  { key: 'allergen', placeholder: 'Allergen *', required: true },
  { key: 'reaction', placeholder: 'Reaction (optional)' },
  { key: 'severity', placeholder: 'Severity', type: 'select', options: ALLERGY_SEVERITY_OPTIONS },
];
```

```tsx
// Wrong: field definitions inline in the component
<InlineEditForm
  fields={[
    { key: 'allergen', placeholder: 'Allergen *', required: true },
    { key: 'reaction', placeholder: 'Reaction (optional)' },
  ]}
/>
```

### API Types

All TypeScript types for API data live in `frontend/src/api/client.ts`. Defining
a data type inline in a component means there's no single source of truth — when
the API changes, the inline type won't be discovered by searching `client.ts`,
and it will silently fall out of sync. If a new entity or field is added,
`client.ts` is the one place to update, and TypeScript will propagate the change
to every consumer.

This means: when creating a new tab, modal, or component that works with a data
entity, import the type from `client.ts`. If the type doesn't exist yet (because
you're building a new feature), add it to `client.ts` first, then import it.
Defining a local `interface` in the component file for API data — even as a
"temporary" measure — creates exactly the kind of drift this rule prevents. The
only exception is props interfaces (`SomeTabProps`, `SomeModalProps`) which are
component-specific and belong in the component file.

## Error States

Error alerts in forms use the danger theme tokens so they stay visually
consistent with other error states across the app:

```tsx
{error && (
  <div className="mb-4 bg-danger-light border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm">
    {error}
  </div>
)}
```

`bg-red-50 border-red-200 text-red-600` are the wrong classes here — they
bypass the theme and won't update if the danger color ever changes.
