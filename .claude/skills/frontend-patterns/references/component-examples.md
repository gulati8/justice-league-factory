# Frontend Patterns — Component Examples

Examples use a to-do list application domain: tasks, labels, comments,
attachments, users. Components are React/TypeScript with Tailwind CSS.

## Component Layer Classes

Use project-defined component classes for all standard UI elements. Do not
rebuild them from raw utilities.

```tsx
// Right: component layer classes
<button className="btn-primary">Create Task</button>
<button className="btn-secondary btn-sm">Cancel</button>
<button className="btn-danger">Delete Task</button>
<input className="input" type="text" placeholder="Task title" />
<label className="label">Priority</label>
<select className="input">{/* options */}</select>
<div className="card p-4">{/* content */}</div>
<span className="badge badge-success">Done</span>
<span className="badge badge-warning">In Progress</span>
```

```tsx
// Wrong: raw utilities instead of component classes
<button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
  Create Task
</button>
<input className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2" />
```

Available button variants (adapt names to the target project's design system):
- `.btn-primary` — primary actions (save, confirm, submit)
- `.btn-secondary` — secondary actions (cancel, back, close)
- `.btn-danger` — destructive actions (delete, remove, archive)
- `.btn-ghost` — low-emphasis actions (icon buttons, inline actions)
- `.btn-sm` — modifier for compact contexts

## Theme Token Usage

Use semantic theme tokens for colors. They update everywhere when the theme
changes. Default palette values silently drift.

```tsx
// Right: semantic tokens
<p className="text-surface-600 text-sm">Due tomorrow</p>
<span className="text-navy font-semibold">My Tasks</span>
<div className="bg-danger-light border border-danger rounded-lg p-3 text-danger text-sm">
  Title is required.
</div>
<span className="text-success">3 completed</span>
```

```tsx
// Wrong: default Tailwind palette
<p className="text-gray-600 text-sm">Due tomorrow</p>
<span className="text-gray-900 font-semibold">My Tasks</span>
<div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
  Title is required.
</div>
```

**Substitution quick-reference:**

| Wrong | Right |
|-------|-------|
| `text-gray-400` | `text-surface-400` |
| `text-gray-500` | `text-surface-500` |
| `text-gray-600` | `text-surface-600` |
| `text-gray-900` | `text-navy` |
| `bg-gray-50` | `bg-surface-100` |
| `border-gray-200` | `border-surface-200` |
| `text-red-600` | `text-danger` |
| `bg-red-50` | `bg-danger-light` |
| `text-green-500` | `text-success` |
| `bg-green-50` | `bg-success-light` |
| `text-blue-500` | `text-steel` |

## Inline Styles Anti-Pattern

```tsx
// Wrong: inline style with CSS variable
<h1 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-navy)' }}>
  My Tasks
</h1>

// Wrong: hardcoded rgba
<div style={{ background: 'rgba(27,42,74,0.5)' }}>

// Wrong: hardcoded hex
<span style={{ color: '#ef4444' }}>Error</span>

// Right: computed value that cannot be a utility class (only acceptable case)
<div style={{ width: `${completionPercent}%` }} className="bg-success h-2 rounded-full" />
```

## Component File Structure

```
frontend/src/
  components/
    InlineEditForm.tsx       # Reusable add/edit form
    AttachmentUpload.tsx     # Reusable file upload widget
    TaskCard.tsx             # Used on dashboard + search results
    AddTaskModal.tsx         # Shared modal — used from multiple pages
    ConfirmModal.tsx         # Generic confirmation dialog
  pages/
    Dashboard.tsx            # Task list page
    task-detail/
      constants.ts           # Field definitions and select options
      utils.ts               # formatDueDate(), priorityLabel(), etc.
      TaskDetailPage.tsx     # Assembles sections
      sections/
        OverviewSection.tsx
        LabelsSection.tsx
        CommentsSection.tsx
        AttachmentsSection.tsx
      tabs/
        OverviewTab.tsx
        LabelsTab.tsx
        CommentsTab.tsx
  api/
    client.ts                # API functions + ALL TypeScript types
  hooks/
    useAuth.tsx
    useTasks.tsx
```

## Modal Pattern

```tsx
// AddTaskModal.tsx
interface AddTaskModalProps {
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
}

export function AddTaskModal({ onClose, onTaskCreated }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const task = await createTask({ title, priority });
      onTaskCreated(task);
      onClose();
    } catch (err) {
      setError('Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    // backdrop
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      {/* card */}
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* header */}
        <div className="flex justify-between items-center p-6 border-b border-surface-200">
          <h2 className="text-lg font-semibold text-navy">Add Task</h2>
          <button onClick={onClose} className="btn-ghost btn-sm">✕</button>
        </div>
        {/* content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-danger-light border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="label">Title *</label>
            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {/* actions */}
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## Tab Pattern

```tsx
// LabelsTab.tsx
interface LabelsTabProps {
  labels: TaskLabel[];
  setLabels: (labels: TaskLabel[]) => void;
  taskId: number;
}

export function LabelsTab({ labels, setLabels, taskId }: LabelsTabProps) {
  // state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  // CRUD handlers
  async function handleAdd(values: Record<string, string>) {
    const label = await createTaskLabel({ taskId, ...values });
    setLabels([...labels, label]);
    setShowForm(false);
  }

  async function handleEdit(id: number, values: Record<string, string>) {
    const updated = await updateTaskLabel(id, values);
    setLabels(labels.map(l => l.id === id ? updated : l));
    setEditingId(null);
  }

  async function handleDelete(id: number) {
    await deleteTaskLabel(id);
    setLabels(labels.filter(l => l.id !== id));
    setDeletingId(null);
  }

  return (
    <div>
      {/* header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-surface-600 uppercase tracking-wide">Labels</h3>
        <button onClick={() => setShowForm(true)} className="btn-secondary btn-sm">+ Add Label</button>
      </div>

      {/* add form */}
      {showForm && (
        <InlineEditForm
          fields={LABEL_FIELDS}
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* empty state */}
      {labels.length === 0 && !showForm && (
        <p className="text-surface-500 text-sm">No labels yet.</p>
      )}

      {/* list */}
      <div className="divide-y divide-surface-100">
        {labels.map(label => (
          <div key={label.id} className="py-3 flex items-center justify-between">
            {editingId === label.id ? (
              <InlineEditForm
                fields={LABEL_FIELDS}
                initialValues={{ name: label.name, color: label.color }}
                onSave={values => handleEdit(label.id, values)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <span className="badge" style={{ backgroundColor: label.color }}>{label.name}</span>
                <div className="flex space-x-2">
                  <button onClick={() => setEditingId(label.id)} className="btn-ghost btn-sm">Edit</button>
                  {deletingId === label.id ? (
                    <>
                      <span className="text-surface-500 text-sm">Sure?</span>
                      <button onClick={() => handleDelete(label.id)} className="btn-danger btn-sm">Yes</button>
                      <button onClick={() => setDeletingId(null)} className="btn-secondary btn-sm">No</button>
                    </>
                  ) : (
                    <button onClick={() => setDeletingId(label.id)} className="btn-ghost btn-sm text-danger">Delete</button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Form Field Definitions in constants.ts

```typescript
// task-detail/constants.ts

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const LABEL_FIELDS: EditField[] = [
  { key: 'name', placeholder: 'Label name *', required: true },
  { key: 'color', placeholder: 'Color (hex)', type: 'text' },
];

export const COMMENT_FIELDS: EditField[] = [
  { key: 'body', placeholder: 'Add a comment...', required: true, type: 'textarea' },
];
```

```tsx
// Wrong: field definitions inline in the component
<InlineEditForm
  fields={[
    { key: 'name', placeholder: 'Label name *', required: true },
    { key: 'color', placeholder: 'Color (hex)', type: 'text' },
  ]}
/>
```

## API Types in client.ts

```typescript
// api/client.ts

// Types
export interface Task {
  id: number;
  title: string;
  summary?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_completed: boolean;
  due_date?: string;
  created_at: string;
  user_id: number;
}

export interface TaskLabel {
  id: number;
  task_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface CreateTaskInput {
  title: string;
  priority?: string;
  due_date?: string;
}

// API functions
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function createTaskLabel(
  input: { taskId: number; name: string; color?: string }
): Promise<TaskLabel> {
  const res = await fetch(`/api/tasks/${input.taskId}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: input.name, color: input.color }),
  });
  if (!res.ok) throw new Error('Failed to create label');
  return res.json();
}
```

```tsx
// Wrong: inline type in the component file (for API data)
// TaskDetailPage.tsx
interface Task {  // ← never define API entity types in component files
  id: number;
  title: string;
}
```

## Error State

```tsx
{error && (
  <div className="mb-4 bg-danger-light border border-danger/20 text-danger px-4 py-3 rounded-lg text-sm">
    {error}
  </div>
)}

{/* For field-level errors */}
{fieldError && <p className="error-text mt-1">{fieldError}</p>}
```

## File/Attachment Upload Component

The `Attachment` metadata type lives in `api/client.ts`, not in the component.
Components import it from there.

```ts
// api/client.ts

export interface Attachment {
  id: number;
  filename: string;
  url: string;
  size_bytes: number;
  mime_type: string;
  created_at: string;
}
```

```tsx
// components/AttachmentUpload.tsx

import type { Attachment } from '../api/client';

interface AttachmentUploadProps {
  taskId: number;
  onUploaded: (attachment: Attachment) => void;
}

export function AttachmentUpload({ taskId, onUploaded }: AttachmentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB.');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      const attachment: Attachment = await res.json();
      onUploaded(attachment);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <label className="btn-secondary btn-sm cursor-pointer">
        {uploading ? 'Uploading...' : 'Attach File'}
        <input type="file" className="sr-only" onChange={handleFileChange} disabled={uploading} />
      </label>
      {error && <p className="error-text mt-1">{error}</p>}
    </div>
  );
}
```

Feature components receive completed `Attachment` objects — they never
re-implement upload logic:

```tsx
// AttachmentsSection.tsx — consumes AttachmentUpload, never duplicates its logic
function AttachmentsSection({ taskId }: { taskId: number }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  return (
    <div>
      <AttachmentUpload
        taskId={taskId}
        onUploaded={att => setAttachments(prev => [...prev, att])}
      />
      <div className="mt-4 divide-y divide-surface-100">
        {attachments.map(att => (
          <div key={att.id} className="py-2 flex items-center justify-between">
            <a href={att.url} className="text-steel text-sm hover:underline">{att.filename}</a>
            <span className="text-surface-400 text-xs">{(att.size_bytes / 1024).toFixed(0)} KB</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```
