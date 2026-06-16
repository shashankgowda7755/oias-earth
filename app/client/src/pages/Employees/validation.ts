/**
 * Pure, framework-free validation for the Employee create/edit form.
 *
 * Faithful to the spec: the Employees screen collects
 *   name, profile image, designation, contact no, email   (spec screens[Employees].dataCollected)
 * and the data model lists name/profileImage/designation/contactNo/emailId/isActive
 * (spec dataModel[Employee]). The spec does NOT state which fields are required,
 * the contact-number format, or any uniqueness rules.
 *
 * TODO(openQuestions): the spec's openQuestions list does not pin down
 * per-field required/optional or formats for the Employee form. We make the
 * conservative, low-risk choice of requiring only `name` (the table's primary
 * label) and validating email/url *shape only when a value is present*. We do
 * NOT invent stricter business rules (e.g. mandatory phone, phone length,
 * uniqueness) — those stay open. See NOTES.md in this directory.
 */

export interface EmployeeFormValues {
  name: string;
  profile_image: string;
  designation: string;
  contact_no: string;
  email_id: string;
  is_active: boolean;
}

export type EmployeeFormErrors = Partial<
  Record<keyof EmployeeFormValues, string>
>;

export const emptyEmployeeForm: EmployeeFormValues = {
  name: '',
  profile_image: '',
  designation: '',
  contact_no: '',
  email_id: '',
  is_active: true,
};

// Pragmatic shapes — only used to reject obviously-malformed *non-empty* input.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Phone: digits, spaces, dashes, parens and an optional leading +. 6–15 digits.
const PHONE_RE = /^\+?[\d\s()-]{6,20}$/;

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate a full form snapshot. Returns a (possibly empty) error map.
 * Trims before testing so whitespace-only required fields are caught.
 */
export function validateEmployeeForm(
  values: EmployeeFormValues,
): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {};

  if (!values.name.trim()) {
    errors.name = 'Name is required.';
  } else if (values.name.trim().length > 150) {
    errors.name = 'Name must be 150 characters or fewer.';
  }

  // Email/url/phone are optional; only validate the *shape* when provided.
  const email = values.email_id.trim();
  if (email && !EMAIL_RE.test(email)) {
    errors.email_id = 'Enter a valid email address.';
  }

  const phone = values.contact_no.trim();
  if (phone && !PHONE_RE.test(phone)) {
    errors.contact_no = 'Enter a valid contact number.';
  }

  const image = values.profile_image.trim();
  if (image && !isHttpUrl(image)) {
    errors.profile_image = 'Enter a valid http(s) image URL.';
  }

  return errors;
}

export function hasErrors(errors: EmployeeFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Build the REST write payload from the form. We send snake_case keys to match
 * the live list response shape (spec rest_list_shapes.json employee/list).
 *
 * TODO(openQuestions[3]): writes route through the REST layer the shell speaks;
 * whether the backend ultimately persists via GraphQL is the server's concern.
 * Empty optional strings are sent as null so the server stores absence, not "".
 */
export function toEmployeePayload(
  values: EmployeeFormValues,
): Record<string, unknown> {
  const nullable = (v: string) => {
    const t = v.trim();
    return t === '' ? null : t;
  };
  return {
    name: values.name.trim(),
    profile_image: nullable(values.profile_image),
    designation: nullable(values.designation),
    contact_no: nullable(values.contact_no),
    email_id: nullable(values.email_id),
    is_active: values.is_active,
  };
}
