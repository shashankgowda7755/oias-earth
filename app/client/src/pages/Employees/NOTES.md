# Employees module — notes

Faithful rebuild of the OIAS Earth admin **Employees** section
(`spec/communitree_admin_spec.json` screens[Employees], dataModel[Employee],
apis `/api/v1/employee/list`).

## What this module does

- Lists employees via `POST /api/v1/employee/list` (React Query, key includes
  page/limit/search; cached so re-selecting the tab does not refetch).
- Columns: avatar+name, designation, contact, email, active badge, row actions.
- Add / Edit through the shared `FormDialog`; Delete through `ConfirmDialog`.
- Mutations invalidate the list and toast on success/error.
- Loading / empty / error states delegated to the shared `DataTable`.
- Accessible: labelled section heading, labelled fields, ARIA `switch` for
  Active, per-row action buttons named with the employee, keyboard-operable,
  visible focus rings. Responsive: the table scrolls horizontally on mobile
  (shared `DataTable` wrapper) and the form is single-column.

## Open questions carried (do not invent rules)

- **openQuestions[0]** search field name unconfirmed — we send `search` only
  when non-empty, matching the inferred list contract.
- **openQuestions[3]** writes go through the REST layer the shell speaks; the
  server may persist via GraphQL. Payload is snake_case to match the list shape.
- **openQuestions[4]** delete UX / soft-vs-hard delete unconfirmed. `is_active`
  in the data model suggests soft delete; the backend DELETE route soft-deletes.
  We show a standard confirm + DELETE and let the server decide.
- **openQuestions[5]** Employees filter popover contents are undefined, so the
  `FilterButton` is rendered disabled with an explanatory title rather than
  inventing filter fields.
- **openQuestions[7]** employee/list flat pagination — handled by `listEntity`.

Required/optional per field and the exact contact-number format are **not**
specified anywhere in the spec. We made the minimal, low-risk choice: only
`name` is required; email / URL / phone are validated for *shape only when a
value is present*. No uniqueness or stricter rules invented.

## Divergences / UX improvement proposals (Phase 5)

1. **Boolean field gap → local `ToggleField`.** The shared field set has no
   boolean/switch/checkbox control, but Employees needs an Active toggle. We
   ship a small accessible `role="switch"` locally. *Proposal:* promote a
   `SwitchField`/`CheckboxField` into `@/components/fields` so every module
   models booleans consistently (Sponsors `is_active`, Forests `is_active`,
   Reports `is_active` all need the same thing).

2. **Touched-state from a value-only field API.** The shared field components
   surface only the next string value (no blur/DOM event), so we approximate
   "touched" by marking a field touched on first change and on submit. This
   avoids errors flashing on a pristine form. *Proposal:* add an optional
   `onBlur?: () => void` to `BaseFieldProps` for cleaner blur-based validation.

3. **Delete confirmation wording.** We say "cannot be undone," but if the
   backend truly soft-deletes (`is_active=false`), the record is recoverable.
   *Proposal:* once openQuestions[4] is resolved, switch copy to
   "deactivate / archive" and consider an inline Active toggle in the row for a
   faster reversible flow, reserving the destructive dialog for hard deletes.

4. **No dedicated photo upload.** The original stores hosted image URLs
   (`profile_image`); we collect a URL string. *Proposal:* a real admin would
   want a file upload to the object store; out of scope here (no upload
   endpoint in the spec), flagged for the integrator.

## Files

- `index.tsx` — section component (default export, no props).
- `EmployeeFormDialog.tsx` — create/edit form on the shared dialog.
- `ToggleField.tsx` — local accessible Active switch (gap-fill, see above).
- `useEmployees.ts` — React Query list query + create/update/delete mutations.
- `validation.ts` — pure validation + REST payload builder.
- `cells.tsx` — AvatarCell, ActiveBadge, TextCell, RowActions.
