/**
 * Create / Edit Employee dialog (spec EntityFormDialog variants AddEmployee /
 * EditEmployee). Built on the shared FormDialog + field components.
 *
 * Fields (spec screens[Employees].dataCollected + dataModel[Employee]):
 *   Name (required), Profile Image URL, Designation, Contact No, Email, Active.
 *
 * Behaviour mirrors the spec "Create simple entity" flow:
 *   - Cancel / Escape / backdrop -> close, discard.
 *   - Reset -> restore to the dialog's initial values.
 *   - Save -> validate required (inline errors, no submit if invalid) ->
 *     the parent runs the create/update mutation -> toast -> refetch -> close.
 *
 * This component owns its field state (FormDialog is stateless about fields).
 * The parent passes `initialValues` (empty for create, row-derived for edit),
 * a `submitting` flag, and an async `onSubmit(values)` that performs the write.
 * Validation runs on blur and on submit; the Save button is disabled while the
 * form is invalid after the user has interacted, so a pristine create dialog
 * still lets the user attempt submit (which then reveals required errors).
 */
import { useEffect, useMemo, useState } from 'react';
import { FormDialog, TextField } from '@/components';
import { ToggleField } from './ToggleField';
import {
  type EmployeeFormValues,
  type EmployeeFormErrors,
  validateEmployeeForm,
  hasErrors,
} from './validation';

export interface EmployeeFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: EmployeeFormValues;
  submitting: boolean;
  onSubmit: (values: EmployeeFormValues) => void;
  onClose: () => void;
}

type TouchedMap = Partial<Record<keyof EmployeeFormValues, boolean>>;

export function EmployeeFormDialog({
  open,
  mode,
  initialValues,
  submitting,
  onSubmit,
  onClose,
}: EmployeeFormDialogProps) {
  const [values, setValues] = useState<EmployeeFormValues>(initialValues);
  const [touched, setTouched] = useState<TouchedMap>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Re-seed when the dialog (re)opens or the target row changes. Keying on
  // `open` ensures edit-then-reopen-for-create starts from the right values.
  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setTouched({});
      setSubmitAttempted(false);
    }
    // initialValues is recreated per open by the parent; depend on open + it.
  }, [open, initialValues]);

  const errors: EmployeeFormErrors = useMemo(
    () => validateEmployeeForm(values),
    [values],
  );
  const invalid = hasErrors(errors);

  const set =
    <K extends keyof EmployeeFormValues>(key: K) =>
    (value: EmployeeFormValues[K]) =>
      setValues((prev) => ({ ...prev, [key]: value }));

  const markTouched = (key: keyof EmployeeFormValues) =>
    setTouched((prev) => ({ ...prev, [key]: true }));

  // Show an error only after the field was touched or a submit was attempted.
  const showError = (key: keyof EmployeeFormValues): string | undefined =>
    touched[key] || submitAttempted ? errors[key] : undefined;

  const handleSubmit = () => {
    setSubmitAttempted(true);
    if (invalid) {
      // Reveal all errors; do not submit (spec: missing required -> inline
      // errors, no submit).
      setTouched({
        name: true,
        profile_image: true,
        designation: true,
        contact_no: true,
        email_id: true,
        is_active: true,
      });
      return;
    }
    onSubmit(values);
  };

  const handleReset = () => {
    setValues(initialValues);
    setTouched({});
    setSubmitAttempted(false);
  };

  return (
    <FormDialog
      open={open}
      title={mode === 'create' ? 'Add Employee' : 'Edit Employee'}
      submitLabel={mode === 'create' ? 'Save' : 'Update'}
      submitting={submitting}
      submitDisabled={submitAttempted && invalid}
      onSubmit={handleSubmit}
      onReset={handleReset}
      onClose={onClose}
      maxWidth="sm"
    >
      <div className="grid grid-cols-1 gap-5">
        {/* The shared TextField surfaces only the string value (no blur/event),
            so we mark a field "touched" on its first change and also on submit.
            That keeps inline errors from flashing on a pristine form while
            still revealing them once the user has interacted or tried to save. */}
        <TextField
          label="Name"
          name="name"
          value={values.name}
          onChange={(v) => {
            set('name')(v);
            markTouched('name');
          }}
          required
          autoComplete="off"
          error={showError('name')}
        />
        <TextField
          label="Profile Image URL"
          name="profile_image"
          type="url"
          inputMode="url"
          value={values.profile_image}
          onChange={(v) => {
            set('profile_image')(v);
            markTouched('profile_image');
          }}
          placeholder=" "
          helperText="Optional. Link to a hosted image."
          error={showError('profile_image')}
        />
        <TextField
          label="Designation"
          name="designation"
          value={values.designation}
          onChange={set('designation')}
          error={showError('designation')}
        />
        <TextField
          label="Contact No"
          name="contact_no"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.contact_no}
          onChange={(v) => {
            set('contact_no')(v);
            markTouched('contact_no');
          }}
          error={showError('contact_no')}
        />
        <TextField
          label="Email"
          name="email_id"
          type="email"
          inputMode="email"
          autoComplete="off"
          value={values.email_id}
          onChange={(v) => {
            set('email_id')(v);
            markTouched('email_id');
          }}
          error={showError('email_id')}
        />
        <ToggleField
          label="Active"
          name="is_active"
          checked={values.is_active}
          onChange={set('is_active')}
          helperText="Inactive employees stay in the records but are flagged off."
        />
      </div>
    </FormDialog>
  );
}
