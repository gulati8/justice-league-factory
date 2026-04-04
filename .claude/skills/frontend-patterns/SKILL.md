---
name: frontend-patterns
description: >
  Frontend styling, component structure, and UI consistency standards for the
  FureverCare project. Enforces Tailwind-first styling, component layer classes,
  and established file organization patterns. Injected into Martian Manhunter
  and Cyborg contexts.
user-invocable: false
disable-model-invocation: true
---

# Frontend Patterns

This guides how you write frontend code in the FureverCare project. The project
uses React 18, Vite, React Router 6, and Tailwind CSS 3 with a custom theme.
There is no component library -- all components are custom. The design system
is defined through Tailwind config tokens and component layer classes in
`frontend/src/index.css`.

## The Styling Hierarchy

There are three layers of styling in this project. Use them in this priority
order:

### 1. Component Layer Classes (ALWAYS prefer these)

The project defines reusable classes in `@layer components` in `index.css`.
These are the canonical patterns. ALWAYS use them when they exist.

**Buttons:** ALWAYS use the component classes. NEVER construct buttons from raw
Tailwind utilities.

| Class | Use For |
|-------|---------|
| `.btn-primary` | Primary actions (submit, save, confirm) |
| `.btn-secondary` | Secondary actions (cancel, back) |
| `.btn-accent` | Interactive/secondary CTA (steel blue) |
| `.btn-coral` | Warm accent CTA |
| `.btn-danger` | Destructive actions (delete, remove) |
| `.btn-ghost` | Minimal chrome actions |
| `.btn-sm` | Add to any button class for small variant |

Good:
```tsx
<button className="btn-primary">Save Changes</button>
<button className="btn-secondary btn-sm">Cancel</button>
<button className="btn-danger">Delete Pet</button>
```

Bad -- NEVER do this:
```tsx
<!-- WRONG: rebuilding button styles from utilities -->
<button className="bg-navy text-white px-6 py-3 rounded-lg font-semibold">Save</button>
<button className="bg-[#1B2A4A] text-white px-4 py-2 rounded">Submit</button>
```

**Inputs:** ALWAYS use `.input` for text inputs, textareas, and selects.
ALWAYS use `.label` for form labels.

```tsx
<label className="label">Pet Name</label>
<input className="input" type="text" />
<select className="input">...</select>
<textarea className="input" rows={3} />
```

**Other component classes available:**
- `.card` -- white background card with border and hover shadow
- `.badge`, `.badge-danger`, `.badge-warning`, `.badge-success`, `.badge-info`, `.badge-navy` -- status badges
- `.status-dot`, `.status-dot-success`, etc. -- inline status indicators
- `.breadcrumb` -- breadcrumb navigation
- `.data-table` -- table styling
- `.error-text` -- form error messages

### 2. Tailwind Theme Utilities (for layout and one-off styling)

For spacing, layout, typography sizing, and responsive design, use standard
Tailwind utilities. For COLORS, ALWAYS use the project's Tailwind theme tokens.

The theme is defined in `frontend/tailwind.config.js` and maps to the project's
design tokens:

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

Good:
```tsx
<p className="text-surface-600 text-sm">Secondary text</p>
<div className="bg-danger-light border border-danger rounded-lg p-4">Error message</div>
<span className="text-navy font-semibold">Important label</span>
```

Bad -- NEVER do any of these:
```tsx
<!-- WRONG: using default Tailwind grays instead of theme surface tokens -->
<p className="text-gray-600">Secondary text</p>
<p className="text-gray-400">Placeholder text</p>
<div className="bg-gray-50 border-gray-200">...</div>

<!-- WRONG: using default Tailwind red/green instead of theme semantic colors -->
<span className="text-red-600">Error</span>
<span className="text-green-500">Success</span>
<div className="bg-red-50 border border-red-200 text-red-600">Error box</div>
```

The correct replacements:
- `text-gray-400` -> `text-surface-400`
- `text-gray-500` -> `text-surface-500`
- `text-gray-600` -> `text-surface-600`
- `text-gray-900` -> `text-navy`
- `bg-gray-50` -> `bg-surface` or `bg-surface-100`
- `border-gray-200` -> `border-surface-200`
- `text-red-600` -> `text-danger`
- `bg-red-50` / `bg-red-100` -> `bg-danger-light`
- `text-red-700` -> `text-danger`
- `text-green-500` -> `text-success`
- `text-blue-400` / `hover:border-blue-400` -> `text-steel` / `hover:border-steel`

**NOTE:** The existing codebase has many violations of this rule (e.g.,
`text-gray-500`, `text-red-600`, `bg-red-100` in tab components). Do NOT
propagate these mistakes. New code MUST use the theme tokens. When modifying
an existing file, convert any color classes you touch to theme tokens but do
NOT refactor the entire file -- stay within your task scope.

### 3. Inline Styles and CSS Variables (LAST resort)

NEVER use `style={{}}` with raw CSS variable references or hardcoded values
in new code. This is the worst pattern in the codebase and MUST NOT be
replicated.

Bad -- actual examples from the codebase (do NOT copy these):
```tsx
<!-- WRONG: inline style with CSS variables -->
<h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-navy)' }}>
<!-- WRONG: hardcoded rgba -->
<div style={{ background: 'rgba(27,42,74,0.5)' }}>
<!-- WRONG: hardcoded hex in SVG -->
<rect fill="#1B2A4A"/>
<circle fill="#4A7FB5"/>
```

These patterns exist in `AuthModal.tsx`, `EmergencyCard.tsx`,
`OverviewSection.tsx`, and `Footer.tsx`. They are tech debt. Do not add more.

The ONLY acceptable use of inline `style` is for truly dynamic values computed
at runtime (e.g., a width based on a percentage calculation). Even then, prefer
Tailwind's arbitrary value syntax: `w-[${percent}%]`.

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

A component belongs in `components/` if it is used by two or more pages OR if
it represents a generic UI pattern (modal, form input, avatar).

A component belongs in `pages/<page>/` if it is only used within that page
feature.

**NEVER duplicate UI logic.** If you find yourself copying JSX from one tab
to use in another, extract it to a shared component. The project already does
this well with `InlineEditForm` and `SourceDocumentLink`.

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

Key rules:
- Backdrop: `fixed inset-0 bg-black bg-opacity-50 ... z-50`
- Card: `bg-white rounded-xl max-w-{size} w-full`
- ALWAYS include a close button in the header
- ALWAYS use `btn-primary` and `btn-secondary` for action buttons
- Max width varies: `max-w-md` for forms, `max-w-lg` for content-heavy modals

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

Key rules:
- State is lifted: tab receives `items` and `setItems` from the parent
- Field definitions live in `constants.ts`, not inline in the tab
- `InlineEditForm` handles both add and edit (reused, not duplicated)
- Delete has a confirmation pattern: click "Delete" -> shows "Sure? Yes No"
- Use `divide-y` for list item separation, not manual borders

### Form Field Definitions

Field definitions for `InlineEditForm` MUST live in the `constants.ts` file for
the relevant page, NOT inline in the component.

Good (from `constants.ts`):
```typescript
export const ALLERGY_FIELDS: EditField[] = [
  { key: 'allergen', placeholder: 'Allergen *', required: true },
  { key: 'reaction', placeholder: 'Reaction (optional)' },
  { key: 'severity', placeholder: 'Severity', type: 'select', options: ALLERGY_SEVERITY_OPTIONS },
];
```

Bad:
```tsx
// WRONG: field definitions inline in the component
<InlineEditForm
  fields={[
    { key: 'allergen', placeholder: 'Allergen *', required: true },
    { key: 'reaction', placeholder: 'Reaction (optional)' },
  ]}
/>
```

### API Types

ALL TypeScript types for API data live in `frontend/src/api/client.ts`. NEVER
define a data type inline in a component file. If a new entity or field is added,
the type in `client.ts` MUST be updated.

## Error States

Error alerts in forms MUST use the danger theme tokens:

```tsx
{error && (
  <div className="mb-4 bg-danger-light border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm">
    {error}
  </div>
)}
```

NEVER use `bg-red-50 border-red-200 text-red-600` for error states. Use the
theme tokens.

## What NOT to Do

- NEVER use Tailwind's default gray palette (`text-gray-*`, `bg-gray-*`) -- use `surface-*`
- NEVER use Tailwind's default red/green/blue palettes -- use `danger`, `success`, `info`
- NEVER use hardcoded hex colors in `className` (`bg-[#1B2A4A]`)
- NEVER use `style={{}}` with CSS variable references (`var(--color-navy)`)
- NEVER use `style={{}}` with hardcoded rgba/hex values
- NEVER build button styles from raw utilities when a `.btn-*` class exists
- NEVER build input styles from raw utilities when `.input` class exists
- NEVER inline SVG for close buttons -- copy the X icon pattern from existing modals
- NEVER define field configuration objects inside render functions
- NEVER define API data types outside of `frontend/src/api/client.ts`
- NEVER duplicate the same UI pattern across tabs -- extract to a shared component
