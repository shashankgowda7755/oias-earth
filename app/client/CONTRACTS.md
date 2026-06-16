# Client Shared-System Contracts

Authoritative public API for the CommuniTREE admin **frontend shell**. Module
agents (Users, Sponsors, Employees, Forests, Reports, Jobs) build their section
inside `src/pages/<Section>/index.tsx` and consume ONLY what is documented here.
Do not edit anything outside your `src/pages/<Section>/` directory.

TypeScript is **strict** (`tsconfig.json`). The `@/*` path alias maps to `src/*`
(e.g. `@/components`, `@/lib/api`). Relative imports work too.

> **Auth header contract (CONFIRMED, `spec/write_contracts.md`):** every
> `/api/v1` call sends the **raw JWT** in `Authorization` with **no `Bearer `
> prefix**. `lib/api.ts` does this in a request interceptor — never set the
> header yourself. ("Bearer " yields 500 "jwt malformed"; absent/wrong yields
> 403 "Missing Authorisation Token!".) There is no GraphQL client in the shell.

> **Write contract (CONFIRMED, `spec/write_contracts.md`):**
> - **Create/Update** = `POST /api/v1/<entity>/upsert` as **multipart/form-data**
>   (text fields + optional logo/image File fields). **No `id` => INSERT;
>   `id` present => UPDATE.** Response `{ data: <record> }`.
> - **Delete** = `POST /api/v1/<entity>/delete` body `{ id, <entity>_id }`.
>   **HARD delete** (cascade-detaches forests/trees). Response `{ message }`.
> - **List** = `POST /api/v1/<entity>/list` body `{ page, limit, search? }`.
>
> Use `upsertEntity` / `deleteEntity` / `listEntity` — never hand-roll URLs.

---

## 1. Entity types — `@/types/entities`

Shapes match the LIVE REST list responses. They are mostly snake_case;
`UserRow`/`RoleRow` and sponsor timestamps are camelCase because that is what
the API returns. Import the row type for your section.

```ts
export interface Pagination { total: number; page: number; limit: number; }
export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
  filter_limit?: Record<string, unknown>; // reports/list only
}
export type EntityName =
  | 'users' | 'roles' | 'sponsors' | 'sponsor' | 'employee' | 'forest'
  | 'reports' | 'report' | 'jobs';
// NB: list routes are plural; the write whitelist keys are SINGULAR for
// sponsors (`sponsor`) and reports (`report`). Both segments are valid here, so
// writes need no cast — pass the plural to listEntity, the singular to
// upsert/deleteEntity (employee/forest/users are the same for both).

export interface UserRow {
  id: number | string;
  firstName: string | null; lastName: string | null;
  imageUrl: string | null;
  username: string; role: string; roleId: number;
  user_role_id: string;            // uuid of join row (parity w/ live response)
  email: string | null; mobile: string | null;
}
export interface RoleRow { id: number; name: string; }
export interface SponsorRow {
  id: string; sponsor_name: string; sponsor_logo: string | null;
  is_active: boolean; sponsor_forest_logo: string | null;
  sponsor_tree_logo: string | null; sponsor_og_image_url: string | null;
  established_year: string | null; website_url: string | null;
  industry: string | null; headquarters: string | null;
  created_by: string | null; updated_by: string | null;
  createdAt: string; updatedAt: string;
}
export interface EmployeeRow {
  id: string; name: string; profile_image: string | null;
  designation: string | null; contact_no: string | null; email_id: string | null;
  created_by: string | null; updated_by: string | null;
  is_active: boolean; created_at: string; updated_at: string;
}
export interface ForestSponsorSummary {
  id: string; sponsor_name: string; sponsor_logo: string | null;
  sponsor_forest_logo: string | null; sponsor_tree_logo: string | null;
  sponsor_og_image_url: string | null;
}
export interface UserSummary { id: string; first_name: string; }
export interface ForestRow {
  id: string; forest_name: string;
  forest_geo_lat: string | null; forest_geo_long: string | null;
  forest_oxygen: string | null; forest_carbonoffset: string | null;
  forest_address: string | null; forest_city: string | null;
  forest_state: string | null; forest_country: string | null;
  is_active: boolean; created_at: string; updated_at: string;
  created_by: UserSummary | string | null;
  updated_by: UserSummary | string | null;
  forest_unique_id: string; forest_internal_id: string;
  total_trees: number; average_age: number; total_species_planted: number;
  box_rows: number; box_column: number; tree_row: number; tree_column: number;
  project_period: number; plantation_date: string | null; is_updated: boolean;
  sponsors: ForestSponsorSummary[];
}
export interface ReportForestSummary {
  id: string; forest_name: string; forest_unique_id: string;
}
export interface ReportRow {
  id: string; year: number; quarter: number;
  report_date: string | null; plantation_date: string | null;
  start_date: string | null; end_date: string | null;
  mode: string | null; type: string | null;
  version: number; project_period: number; forest_id: string;
  skip: unknown;
  created_by: string | null; updated_by: string | null;
  is_active: boolean; created_at: string; updated_at: string;
  Forest: ReportForestSummary | null;
  CreatedBy: UserSummary | null; UpdatedBy: UserSummary | null;
}
export interface JobRow {
  id: string; job_id: string; job_type: string;
  job_description: Record<string, unknown> | null;
  status: string;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  created_by: string | null; updated_by: string | null;
  created_at: string; updated_at: string;
}
```

---

## 2. API helpers — `@/lib/api`

```ts
export const API_BASE_URL = '/api/v1';
export const api: AxiosInstance;          // shared instance; auth header auto-added

export interface ApiError { message: string; status?: number; raw?: unknown; }
// All helpers reject with ApiError (flat .message ready to show in a Toast).

// --- auth ---
export interface LoginResponse { token: string; user?: UserDetails; role?: string;
  profileId?: string; [key: string]: unknown; }
export function login(username: string, password: string): Promise<LoginResponse>;
// (You usually call useAuth().signIn instead of login directly.)

// --- lists ---
export interface ListParams {
  page?: number;            // default 1
  limit?: number;           // default 10
  search?: string;          // server-side search (CONFIRMED: body {page,limit,search})
  filters?: Record<string, unknown>; // forwarded when present (openQuestions[5])
}

// Result carries BOTH the new {rows,total,page,limit} aliases AND the legacy
// {data, pagination, filter_limit} fields (Paginated<T>), so all existing
// module hooks keep working. New code SHOULD prefer .rows / .total.
export interface ListResult<T> extends Paginated<T> {
  rows: T[];                // alias of .data
  total: number;            // alias of .pagination.total
  page: number;             // alias of .pagination.page
  limit: number;            // alias of .pagination.limit
}
export function listEntity<T>(name: EntityName, params?: ListParams): Promise<ListResult<T>>;
// POST /api/v1/<name>/list {page,limit,search?[,filters]}.
// Normalises BOTH pagination shapes (employee flat {data,total,page,limit} vs
// {data,pagination:{...}}) into ListResult<T>. reports/list filter_limit is
// passed through on .filter_limit.

// --- writes: upsert (create + update in one call) ---
export type UpsertValue = string | number | boolean | null | undefined;
export type UpsertValues = Record<string, UpsertValue>;
export type UpsertFiles = Record<string, File | File[] | null | undefined>;

export function upsertEntity<TRecord = unknown>(
  name: EntityName,
  values: UpsertValues,            // NO id => INSERT; id present => UPDATE
  files?: UpsertFiles,             // logo/image File fields (e.g. sponsor_logo)
  config?: AxiosRequestConfig,
): Promise<TRecord>;               // returns response.data.data (the record)
// POST /api/v1/<name>/upsert.
//  - with File fields => multipart/form-data (browser sets the boundary).
//  - without files    => JSON fallback (lighter; live upsert accepts it for
//                        text-only entities).
// Booleans/numbers are stringified into FormData; null/undefined are omitted.

// Helper exposed for advanced callers that need the raw body (rare):
export function buildUpsertFormData(values: UpsertValues, files?: UpsertFiles): FormData;

// --- writes: delete (HARD) ---
export interface DeleteResponse { message: string; }
export function deleteEntity<TResp = DeleteResponse>(
  name: EntityName,
  id: string | number,
  config?: AxiosRequestConfig,
): Promise<TResp>;
// POST /api/v1/<name>/delete  body { id, <name>_id }. Sends BOTH keys exactly
// like the live site (e.g. { id, sponsor_id }). HARD delete. Confirm first with
// <ConfirmDialog variant="danger">.

// --- species search (forest wizard + AutocompleteField) ---
export function speciesSearch<T = unknown>(q: string, config?: AxiosRequestConfig): Promise<T[]>;
// POST /api/v1/master-plantspecies/search { search } -> returns the data array.

// --- DEPRECATED back-compat write shims (still routed to /upsert) ---
// Kept so the original module hooks compile; new code should use upsertEntity.
//   createEntity(name, payload)        -> upsert (INSERT); resolves to { data: record }
//   updateEntity(name, id, payload)    -> upsert (UPDATE, id merged in); { data: record }
export function createEntity<TResp = unknown, TBody = unknown>(
  name: EntityName, payload: TBody, config?: AxiosRequestConfig): Promise<TResp>;
export function updateEntity<TResp = unknown, TBody = unknown>(
  name: EntityName, id: string | number, payload: TBody, config?: AxiosRequestConfig): Promise<TResp>;
```

**Recommended usage with React Query** (lists are cached so re-selecting a tab
does not refetch — matches spec behavior):

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listEntity, upsertEntity, deleteEntity } from '@/lib/api';
import type { SponsorRow } from '@/types/entities';

const { data, isLoading, error } = useQuery({
  queryKey: ['sponsors', { page, limit, search }],
  queryFn: () => listEntity<SponsorRow>('sponsors', { page, limit, search }),
});
// data?.rows -> SponsorRow[]   data?.total -> number   (or .data / .pagination)

// create (no id) or update (id present) with a logo File:
const save = useMutation({
  mutationFn: (form: { values: Record<string, string>; logo: File | null }) =>
    upsertEntity<SponsorRow>('sponsor', form.values, { sponsor_logo: form.logo }),
});

// hard delete (confirm first):
const remove = useMutation({ mutationFn: (id: string) => deleteEntity('sponsor', id) });
```

---

## 3. Auth — `@/auth/AuthContext`, `@/auth/ProtectedRoute`

```ts
function useAuth(): {
  session: AuthSession | null;
  isAuthenticated: boolean;
  role: string | null;                 // localStorage.role (gates UI per spec)
  signIn(username: string, password: string): Promise<void>; // throws on failure
  signOut(): void;                      // clears localStorage
};
// AuthSession = { token, role, profileId, userDetails } (see @/lib/auth-storage)
```

`<AuthProvider>` and `<ToastProvider>` are already mounted in `App.tsx`; just
call the hooks. `role` is available for role-scoped tab/column visibility
(spec flow "Role-scoped forest access" — currently inferred, gate with a TODO).

---

## 4. Shared components — `@/components`

Import everything from the barrel: `import { DataTable, FormDialog, ... } from '@/components';`

### DataTable&lt;T&gt;

Card with toolbar (search left, toolbar slot right), header, body states
(loading / error / empty), footer (rows-per-page + numbered pagination).
Server-side pagination — the component never slices rows. **Row actions** are a
kebab (⋮) menu rendered automatically when any of `onView` / `onEdit` /
`onDelete` is supplied; the menu items are **View / Edit / Delete** (each shown
only when its handler is given). Delete is destructive — the table just calls
`onDelete(row)`; YOU open `<ConfirmDialog variant="danger">` and run the delete
mutation in your page.

```ts
interface Column<T> {
  key: string;                                   // also the React key
  header: React.ReactNode;
  render?: (row: T, rowIndex: number) => React.ReactNode; // else row[key]
  className?: string;                            // td + th classes
  headerClassName?: string;                      // th-only classes
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId?: (row: T, index: number) => string | number; // default row.id ?? index

  loading?: boolean;
  error?: string | null;                         // shows error state when set
  emptyContent?: React.ReactNode;                // default "No records found."

  // server-side pagination (component never slices rows)
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;        // reset page to 1 yourself
  rowsPerPageOptions?: number[];                 // default [10,25,50,100]

  // search (debounced internally; pass committed value, get debounced updates)
  search?: string;
  onSearch?: (value: string) => void;            // omit to hide the search box
  searchPlaceholder?: string;                    // e.g. "Search users..."
  searchDebounceMs?: number;                     // default 350

  toolbar?: React.ReactNode;                     // right slot: <AddButton/> + <FilterButton/>
  caption?: string;                              // a11y caption

  // row actions (kebab menu View / Edit / Delete) — providing ANY adds the column
  onView?: (row: T, rowIndex: number) => void;
  onEdit?: (row: T, rowIndex: number) => void;
  onDelete?: (row: T, rowIndex: number) => void; // YOU confirm + run the delete
  actionsHeader?: React.ReactNode;               // default '' (sr-only "Actions")
  renderRowActions?: (row: T, rowIndex: number) => React.ReactNode; // escape hatch;
    // when set, onView/onEdit/onDelete are ignored
}

function DataTable<T>(props: DataTableProps<T>): JSX.Element;
```

### AddButton / FilterButton / Button

```ts
interface AddButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'> {
  label: string;                  // "Add User" -> renders "+ Add User"
}
function AddButton(props: AddButtonProps): JSX.Element;       // green primary

interface FilterButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;               // accent border when filters applied
}
function FilterButton(props: FilterButtonProps): JSX.Element; // funnel icon button

type ButtonVariant = 'primary' | 'outlined' | 'text' | 'danger';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;        // default 'primary'
  loading?: boolean;              // shows spinner, disables
  startIcon?: React.ReactNode;
}
function Button(props: ButtonProps): JSX.Element;
```

### FormDialog (create/edit modal)

```ts
interface FormDialogProps {
  open: boolean;
  title: string;
  children: React.ReactNode;          // your fields
  onSubmit: () => void | Promise<void>; // Save / Enter; preventDefault handled
  onClose: () => void;                // Cancel / Escape / backdrop
  onReset?: () => void;               // omit to hide the Reset button
  submitting?: boolean;               // disables footer + shows spinner on Save
  submitLabel?: string;               // default "Save"
  submitDisabled?: boolean;           // disable Save when form invalid
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'; // default 'md'
  footer?: React.ReactNode;           // replace footer entirely (forest wizard Back/Next)
}
function FormDialog(props: FormDialogProps): JSX.Element | null;
```

The dialog renders a `<form>`; Save triggers submit (Enter-to-submit + native
required validation work). It owns NO field state — you control your fields.

### ConfirmDialog (delete confirmation)

The `danger` variant (default) renders the standing warning
**"This action cannot be undone."** beneath your message and forces the red
confirm button — use it for the HARD deletes this app performs.

```ts
interface ConfirmDialogProps {
  open: boolean;
  title?: string;                 // default "Are you sure?"
  message: string;
  confirmLabel?: string;          // default "Delete"
  cancelLabel?: string;           // default "Cancel"
  destructive?: boolean;          // red button; defaults from `variant`
  variant?: 'default' | 'danger'; // default 'danger' (adds the warning copy)
  confirming?: boolean;           // spinner + disable while deleting
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}
function ConfirmDialog(props: ConfirmDialogProps): JSX.Element | null;
```

### Field components (outlined + floating label)

**String-valued** fields share `BaseFieldProps`: controlled via `value: string`
and `onChange: (value: string) => void` (you get the string, not the event),
plus `label` (required; doubles as a11y name), optional `name`, `id`,
`required`, `disabled`, `error?: string` (danger style + helper text),
`helperText?: string`, `className`.

```ts
// BaseFieldProps (shared by Text / Password / TextArea / Select):
// { label: string; value: string; onChange: (v: string) => void;
//   name?: string; id?: string; required?: boolean; disabled?: boolean;
//   error?: string; helperText?: string; className?: string; }

interface TextFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'number' | 'tel' | 'url';   // default 'text'
  placeholder?: string; autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'url';
}
function TextField(props: TextFieldProps): JSX.Element;

interface PasswordFieldProps extends BaseFieldProps {   // built-in show/hide toggle
  placeholder?: string; autoComplete?: string;          // default 'current-password'
}
function PasswordField(props: PasswordFieldProps): JSX.Element;

interface TextAreaFieldProps extends BaseFieldProps {
  rows?: number;                 // default 3
  placeholder?: string; maxLength?: number;
}
function TextAreaField(props: TextAreaFieldProps): JSX.Element;

interface SelectOption { value: string; label: string; disabled?: boolean; }
interface SelectFieldProps extends BaseFieldProps {
  options: SelectOption[];
  placeholder?: string;          // empty-value option text
  nativeProps?: Omit<SelectHTMLAttributes<HTMLSelectElement>, ...>;
}
function SelectField(props: SelectFieldProps): JSX.Element;
```

**Boolean-valued** toggles (`value: boolean`, `onChange: (v: boolean) => void`)
— share the same label/name/id/required/disabled/error/helperText/className:

```ts
interface SwitchFieldProps {
  label: string; value: boolean; onChange: (v: boolean) => void;
  name?: string; id?: string; required?: boolean; disabled?: boolean;
  error?: string; helperText?: string; className?: string;
}
function SwitchField(props: SwitchFieldProps): JSX.Element;   // MUI-switch look (is_active)

interface CheckboxFieldProps { /* identical shape to SwitchFieldProps */ }
function CheckboxField(props: CheckboxFieldProps): JSX.Element;
```

**DateField** — string-valued (`value`/`onChange` carry an ISO `yyyy-mm-dd`):

```ts
interface DateFieldProps {
  label: string; value: string; onChange: (v: string) => void;
  name?: string; id?: string; required?: boolean; disabled?: boolean;
  error?: string; helperText?: string; className?: string;
  min?: string; max?: string;     // ISO yyyy-mm-dd bounds
}
function DateField(props: DateFieldProps): JSX.Element;
```

**FileField** — File-valued; renders an image thumbnail preview. Use it for the
logo/image uploads the `/upsert` multipart contract expects; pass the chosen
`File` straight into `upsertEntity(name, values, { <fileField>: file })`.

```ts
interface FileFieldProps {
  label: string;
  value: File | null;                 // controlled
  onChange: (file: File | null) => void;
  name?: string; id?: string; required?: boolean; disabled?: boolean;
  error?: string; helperText?: string; className?: string;
  accept?: string;                    // default 'image/*'
  previewUrl?: string | null;         // existing remote URL to preview (edit form)
}
function FileField(props: FileFieldProps): JSX.Element;
```

**AutocompleteField** — async single-select combobox for large/searched option
sets (Site Manager, Sponsor, User, Species). `value` is the selected id;
`onChange(id, option?)` fires on pick (and `('', undefined)` on clear). Provide
`loadOptions(query)` (debounced internally) — wrap `speciesSearch` or
`listEntity(...)` and map to `AutocompleteOption[]`. For edit prefills, pass
`selectedOption` so the input shows the label without a fetch.

```ts
interface AutocompleteOption { value: string; label: string; description?: string; }
interface AutocompleteFieldProps {
  label: string;
  value: string;                                  // selected id, or ''
  onChange: (value: string, option?: AutocompleteOption) => void;
  loadOptions: (query: string) => Promise<AutocompleteOption[]>;
  selectedOption?: AutocompleteOption | null;     // show current label w/o fetch
  name?: string; id?: string; required?: boolean; disabled?: boolean;
  error?: string; helperText?: string; className?: string;
  placeholder?: string;
  debounceMs?: number;                            // default 300
  minChars?: number;                              // default 0 (load on focus)
}
function AutocompleteField(props: AutocompleteFieldProps): JSX.Element;
```

Example (forest wizard sponsor picker):

```tsx
import { AutocompleteField, type AutocompleteOption } from '@/components';
import { listEntity } from '@/lib/api';
import type { SponsorRow } from '@/types/entities';

const loadSponsors = useCallback(async (q: string): Promise<AutocompleteOption[]> => {
  const res = await listEntity<SponsorRow>('sponsors', { page: 1, limit: 20, search: q });
  return res.rows.map((s) => ({ value: s.id, label: s.sponsor_name }));
}, []);

<AutocompleteField label="Sponsor" required value={sponsorId}
  onChange={setSponsorId} loadOptions={loadSponsors} />
```

For the Add User Role select, populate `options` from
`listEntity<RoleRow>('roles')` -> `{ value: String(r.id), label: r.name }`.

### useToast (feedback after mutations)

```ts
interface ToastApi {
  show(message: string, severity?: 'success'|'error'|'info', opts?: { duration?: number }): void;
  success(message: string, opts?: { duration?: number }): void;
  error(message: string, opts?: { duration?: number }): void;
  info(message: string, opts?: { duration?: number }): void;
}
function useToast(): ToastApi;     // provider already mounted in App.tsx
```

### Spinner

```ts
interface SpinnerProps { size?: number; className?: string; label?: string; }
function Spinner(props: SpinnerProps): JSX.Element;
```

### TabNav / AppHeader / SECTION_TABS

Owned by the shell (Dashboard renders them). You normally don't import these,
but they're exported:

```ts
const SECTION_TABS: readonly ['Users','Sponsors','Employees','Forests','Reports','Jobs'];
type SectionTab = (typeof SECTION_TABS)[number];
```

---

## 5. What your section module must export

`src/pages/<Section>/index.tsx` must **default-export** a React component taking
**no required props** (Dashboard renders `<Users />` etc.):

```tsx
export default function Users() {
  // your DataTable + dialogs here
}
```

(The old `SectionStub` placeholder has been removed — every section now ships a
real page.)

---

## 6. Reference: column sets + write fields per section

- **Users**: User (avatar+name), Username, Role, Email, Mobile. Add User form:
  First Name, Last Name, Username, Role(select from roles/list), Email, Mobile,
  Password. Use the PROFILE id (`UserRow.id`) for upsert/delete.
- **Sponsors**: logo, sponsor_name, industry, headquarters, website_url,
  established_year, is_active. Upsert files: `sponsor_logo`,
  `sponsor_forest_logo`, `sponsor_tree_logo`, `sponsor_og_image_url`
  (FileField -> `upsertEntity('sponsor', values, { sponsor_logo, ... })`).
  Required (CONFIRMED): `sponsor_name`, `established_year`, ≥1 logo file.
- **Employees**: profile_image, name, designation, contact_no, email_id,
  is_active. File: `profile_image`. (`listEntity('employee', ...)` handles the
  flat pagination shape.)
- **Forests**: forest_name, forest_internal_id, forest_unique_id, sponsors[0],
  geo (lat,long), total_trees, total_species_planted, plantation_date.
  Add = **2-step wizard** ('1 Basic Info', '2 Grid Config'). Step 2 renders a
  grid of Box cards (`box_rows` x `box_column`); clicking a card opens
  EditBoxDialog (Prefix, Start Digits, Start auto-calc, species rows;
  capacity = tree_row*tree_column). Final button 'Save Forest'. Site Manager /
  Sponsor / User use AutocompleteField; Species uses AutocompleteField backed by
  `speciesSearch`. Submit -> `upsertEntity('forest', ...)` which the server runs
  as the async `forest_upsert_v1` job (status visible in Jobs tab).
- **Reports**: year, quarter, Forest.forest_name, type, mode, version,
  report_date, is_active. `ListResult.filter_limit` carries filter metadata.
- **Jobs**: job_id, job_type, status, job_description, created_at, updated_at.
  Read-only monitor — omit AddButton + row actions from the toolbar.

---

## 7. Open questions (carry as TODO comments referencing the spec)

Do NOT invent business rules. Where the spec is uncertain, leave a TODO citing
`spec/communitree_admin_spec.json openQuestions[n]`:

- **RESOLVED** list body = `{page,limit,search}` (server-side ILIKE). Per-table
  FilterButton popover params still partly unknown; reports returns
  `filter_limit` metadata. (openQuestions[0], [5])
- **RESOLVED** writes go via REST. Create/Update = `POST /<entity>/upsert`
  (multipart; no id=insert, id=update). (openQuestions[3])
- **RESOLVED** delete = `POST /<entity>/delete {id,<entity>_id}`; **HARD**
  delete, confirm "cannot be undone", cascade-detaches. (openQuestions[4])
- **RESOLVED** forest wizard = 2 steps (Basic Info, Grid Config) + per-box
  EditBoxDialog + 'Save Forest'. (openQuestions[2])
- Login success response body shape (token confirmed; user object not). (openQuestions[1])
- Reports `reportData` JSON schema; Jobs queue purpose. (openQuestions[6])
- **RESOLVED/handled** pagination inconsistency (employee flat vs
  `{pagination}`) — normalised by `listEntity`. (openQuestions[7])
- Whether non-SuperAdmin roles change visible tabs/columns. (openQuestions[8])
- Sapling / whatsapp / donor / gift / nudge domains — out of scope. (openQuestions[9])

---

## 8. Design tokens (Tailwind theme — `tailwind.config.ts`)

Use these class names; don't hardcode hex:

| token | class | value |
|---|---|---|
| primary green | `bg-primary` `text-primary` `border-primary` | `#17970E` (`primary-hover` `#137a0b`) |
| nav bar | `bg-navbar` `text-navbar-text` `text-navbar-inactive` | `#4d4d4d` / white / white-70% |
| app background | `bg-appbg` | `#f5f5f5` |
| surface | `bg-surface` | `#fff` |
| table header | `bg-tableHeader` | `#eef1f3` |
| text | `text-textPrimary` `text-textSecondary` | rgba .87 / .54 |
| border | `border-border` | rgba .12 |
| danger | `bg-danger` `text-danger` | `#d32f2f` (`danger-hover` `#b71c1c`) |
| label font | `text-label` | 12px (floating labels, helper text) |
| radii | `rounded-button` `rounded-input` `rounded-card` `rounded-pill` | 4 / 4 / 8 / 9999 px |
| shadow | `shadow-card` `shadow-dialog` `shadow-appbar` | MUI elevations |
| font | `font-sans` | Noto Sans, Arial, sans-serif |

---

## 9. Verification

- `npm run typecheck` (alias `tsc --noEmit`) must stay green.
- `npm run build` (tsc + vite) must succeed.
- `npm run dev` serves on :5173 and proxies `/api/v1` + `/graphql` to the
  Express server (`SERVER_ORIGIN`, default `http://localhost:4000`).
```
