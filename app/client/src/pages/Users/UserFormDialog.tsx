/**
 * Create / Edit User dialog (spec EntityFormDialog → AddUser).
 *
 * Fields (spec screens.Users.dataCollected):
 *   First Name, Last Name, Username, Role (select from roles/list),
 *   Email, Mobile, Password.
 *
 * Modes:
 *   - create: all required-by-spec fields validated; password required.
 *   - edit:   same form pre-filled; password is OPTIONAL (left blank = keep
 *             current). Username + Role remain editable per the data model.
 *
 * Validation is client-side + inline (per-field error strings), gating Save.
 * The shared <FormDialog> renders the <form>; Save submits it so native
 * required + Enter-to-submit also work. Field components are fully controlled.
 *
 * NOTE (UX improvement proposal): the original treats every form as a flat
 * "create or edit". For a faithful rebuild we keep that, but we additionally
 * mark which fields are required and surface inline errors before hitting the
 * server — the original appears to rely largely on server-side rejection
 * (openQuestions[0]/[1]). Inline validation is the proposed improvement.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  FormDialog,
  SelectField,
  TextField,
  PasswordField,
  type SelectOption,
} from '@/components';
import type { RoleRow, UserRow } from '@/types/entities';
import type { UserWritePayload } from './useUsers';

export interface UserFormValues {
  firstName: string;
  lastName: string;
  username: string;
  roleId: string; // string for the <select>; converted to number on submit
  email: string;
  mobile: string;
  password: string;
}

const EMPTY: UserFormValues = {
  firstName: '',
  lastName: '',
  username: '',
  roleId: '',
  email: '',
  mobile: '',
  password: '',
};

type FieldErrors = Partial<Record<keyof UserFormValues, string>>;

/** Build initial form values from an existing row (edit) or blanks (create). */
function valuesFromRow(row: UserRow | null): UserFormValues {
  if (!row) return { ...EMPTY };
  return {
    firstName: row.firstName ?? '',
    lastName: row.lastName ?? '',
    username: row.username ?? '',
    roleId: row.roleId != null ? String(row.roleId) : '',
    email: row.email ?? '',
    mobile: row.mobile ?? '',
    password: '',
  };
}

// Light, forgiving validators — fail only on clearly-bad input so we don't
// invent rules the spec didn't state (openQuestions[0]). Required-ness comes
// from the spec's AddUser field list + the backend's CreateUserBody contract.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[0-9+\-()\s]{6,20}$/;

function validate(values: UserFormValues, isEdit: boolean): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.firstName.trim()) errors.firstName = 'First name is required.';
  if (!values.username.trim()) errors.username = 'Username is required.';
  if (!values.roleId) errors.roleId = 'Role is required.';

  if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (values.mobile.trim() && !MOBILE_RE.test(values.mobile.trim())) {
    errors.mobile = 'Enter a valid mobile number.';
  }

  // Password: required on create, optional on edit (blank = keep current).
  if (!isEdit) {
    if (!values.password) {
      errors.password = 'Password is required.';
    } else if (values.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
  } else if (values.password && values.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  return errors;
}

/** Build the API payload from form values (omitting empties / unchanged pwd). */
function toPayload(values: UserFormValues, isEdit: boolean): UserWritePayload {
  const payload: UserWritePayload = {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    username: values.username.trim(),
    email: values.email.trim() || undefined,
    mobile: values.mobile.trim() || undefined,
    roleId: values.roleId ? Number(values.roleId) : undefined,
  };
  // Only send a password when the user typed one (create always has one; edit
  // sends it only when changing it).
  if (values.password) payload.password = values.password;
  // On edit, drop empty strings so we don't clobber existing optional fields
  // with blanks; on create, send what we have.
  if (isEdit) {
    if (!payload.lastName) delete payload.lastName;
  }
  return payload;
}

export interface UserFormDialogProps {
  open: boolean;
  /** null => create mode; a row => edit mode (pre-filled, password optional). */
  user: UserRow | null;
  roles: RoleRow[];
  rolesLoading?: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: UserWritePayload) => void | Promise<void>;
}

export function UserFormDialog({
  open,
  user,
  roles,
  rolesLoading = false,
  submitting = false,
  onClose,
  onSubmit,
}: UserFormDialogProps) {
  const isEdit = user != null;
  const [values, setValues] = useState<UserFormValues>(() =>
    valuesFromRow(user),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  // Track whether the user attempted to submit, so we only show errors after
  // an interaction (avoids yelling on first open).
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Re-seed the form whenever the dialog opens or the target row changes.
  useEffect(() => {
    if (open) {
      setValues(valuesFromRow(user));
      setErrors({});
      setSubmitAttempted(false);
    }
  }, [open, user]);

  const roleOptions: SelectOption[] = useMemo(
    () => roles.map((r) => ({ value: String(r.id), label: r.name })),
    [roles],
  );

  const setField =
    (key: keyof UserFormValues) =>
    (value: string) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      // Clear a field's error as soon as the user edits it (after a submit try).
      if (submitAttempted) {
        setErrors((prev) => {
          if (!prev[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    const found = validate(values, isEdit);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await onSubmit(toPayload(values, isEdit));
  };

  const handleReset = () => {
    setValues(valuesFromRow(user));
    setErrors({});
    setSubmitAttempted(false);
  };

  // Only surface errors after a submit attempt (cleaner first-open UX).
  const shown = (key: keyof UserFormValues) =>
    submitAttempted ? errors[key] : undefined;

  return (
    <FormDialog
      open={open}
      title={isEdit ? 'Edit User' : 'Add User'}
      onClose={onClose}
      onReset={handleReset}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={isEdit ? 'Save' : 'Add User'}
      maxWidth="md"
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
        <TextField
          label="First Name"
          required
          value={values.firstName}
          onChange={setField('firstName')}
          autoComplete="given-name"
          error={shown('firstName')}
        />
        <TextField
          label="Last Name"
          value={values.lastName}
          onChange={setField('lastName')}
          autoComplete="family-name"
          error={shown('lastName')}
        />
        <TextField
          label="Username"
          required
          value={values.username}
          onChange={setField('username')}
          autoComplete="username"
          error={shown('username')}
        />
        <SelectField
          label="Role"
          required
          value={values.roleId}
          onChange={setField('roleId')}
          options={roleOptions}
          placeholder={rolesLoading ? 'Loading roles…' : 'Select a role'}
          disabled={rolesLoading}
          error={shown('roleId')}
        />
        <TextField
          label="Email"
          type="email"
          value={values.email}
          onChange={setField('email')}
          autoComplete="email"
          inputMode="email"
          error={shown('email')}
        />
        <TextField
          label="Mobile"
          type="tel"
          value={values.mobile}
          onChange={setField('mobile')}
          autoComplete="tel"
          inputMode="tel"
          error={shown('mobile')}
        />
        <PasswordField
          label={isEdit ? 'New Password' : 'Password'}
          required={!isEdit}
          value={values.password}
          onChange={setField('password')}
          autoComplete="new-password"
          helperText={
            isEdit ? 'Leave blank to keep the current password.' : undefined
          }
          error={shown('password')}
          className="sm:col-span-2"
        />
      </div>
    </FormDialog>
  );
}
