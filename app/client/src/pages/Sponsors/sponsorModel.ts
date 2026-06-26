/**
 * Sponsors module — form model, validation, and REST payload mapping.
 *
 * Kept separate from the React components so the validation rules and the
 * snake_case payload mapping can be unit-reasoned about in isolation.
 *
 * SPEC REFERENCES
 *  - screens[2] (Sponsors): dataCollected = "sponsor name, logos
 *    (sponsor/forest/tree/og image), established year, website, industry,
 *    headquarters" + is_active.
 *  - dataModel[5] (Sponsor): sponsorName, sponsorLogo, sponsorForestLogo,
 *    sponsorTreeLogo, sponsorOgImageUrl, establishedYear, websiteUrl,
 *    industry, headquarters, isActive, timestamps.
 *  - Backend CRUD whitelist (server/src/routes/crud.ts `sponsor`): the columns
 *    accepted on create/update are exactly the snake_case keys below.
 *
 * OPEN QUESTION (spec openQuestions): the spec does not enumerate which sponsor
 * fields are *required*. The live sample shows every field populated, but the
 * only field that is structurally meaningful (table display + the entity's
 * name) is `sponsor_name`. We therefore require ONLY Sponsor Name and treat the
 * rest as optional, and we leave a TODO so a product decision can tighten this.
 * The original UI almost certainly used MUI inline validation; we reproduce the
 * "missing required -> inline error, no submit" behaviour from flows[2].
 */
import type { SponsorRow } from '../../types/entities';

/** Controlled form state — every field is a string for the shared Field API. */
export interface SponsorFormValues {
  sponsor_name: string;
  sponsor_email: string;
  sponsor_logo: string;
  sponsor_forest_logo: string;
  sponsor_tree_logo: string;
  sponsor_og_image_url: string;
  established_year: string;
  website_url: string;
  industry: string;
  headquarters: string;
  /** kept as a boolean — rendered via a toggle, not a text Field. */
  is_active: boolean;
}

/** Per-field error messages; absent key === valid. */
export type SponsorFormErrors = Partial<
  Record<Exclude<keyof SponsorFormValues, 'is_active'>, string>
>;

export const EMPTY_SPONSOR_FORM: SponsorFormValues = {
  sponsor_name: '',
  sponsor_email: '',
  sponsor_logo: '',
  sponsor_forest_logo: '',
  sponsor_tree_logo: '',
  sponsor_og_image_url: '',
  established_year: '',
  website_url: '',
  industry: '',
  headquarters: '',
  is_active: true,
};

/** Map a list row into editable form values (null -> empty string). */
export function sponsorRowToForm(row: SponsorRow): SponsorFormValues {
  return {
    sponsor_name: row.sponsor_name ?? '',
    sponsor_email: row.sponsor_email ?? '',
    sponsor_logo: row.sponsor_logo ?? '',
    sponsor_forest_logo: row.sponsor_forest_logo ?? '',
    sponsor_tree_logo: row.sponsor_tree_logo ?? '',
    sponsor_og_image_url: row.sponsor_og_image_url ?? '',
    established_year: row.established_year ?? '',
    website_url: row.website_url ?? '',
    industry: row.industry ?? '',
    headquarters: row.headquarters ?? '',
    is_active: Boolean(row.is_active),
  };
}

const URL_FIELDS = [
  'sponsor_logo',
  'sponsor_forest_logo',
  'sponsor_tree_logo',
  'sponsor_og_image_url',
  'website_url',
] as const;

/** Lenient URL check — accepts http(s) absolute URLs only. */
function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Client-side validation (spec flows[2]: "missing required -> inline errors,
 * no submit"). Required: sponsor_name. URL fields must be valid http(s) when
 * present. Established year, when present, must be a 4-digit year.
 */
export function validateSponsorForm(values: SponsorFormValues): SponsorFormErrors {
  const errors: SponsorFormErrors = {};

  if (!values.sponsor_name.trim()) {
    errors.sponsor_name = 'Sponsor name is required';
  }

  for (const field of URL_FIELDS) {
    const raw = values[field].trim();
    if (raw && !isValidUrl(raw)) {
      errors[field] = 'Enter a valid http(s) URL';
    }
  }

  const year = values.established_year.trim();
  if (year && !/^\d{4}$/.test(year)) {
    errors.established_year = 'Enter a 4-digit year';
  }

  return errors;
}

export function hasErrors(errors: SponsorFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Build the REST write payload. Keys match the backend `sponsor` column
 * whitelist exactly. Empty optional strings are sent as null so they clear the
 * column on edit and store NULL (not '') on create. `sponsor_name` is always a
 * trimmed string.
 */
export function sponsorFormToPayload(
  values: SponsorFormValues,
): Record<string, unknown> {
  const orNull = (s: string): string | null => {
    const t = s.trim();
    return t === '' ? null : t;
  };
  return {
    sponsor_name: values.sponsor_name.trim(),
    sponsor_logo: orNull(values.sponsor_logo),
    sponsor_forest_logo: orNull(values.sponsor_forest_logo),
    sponsor_tree_logo: orNull(values.sponsor_tree_logo),
    sponsor_og_image_url: orNull(values.sponsor_og_image_url),
    established_year: orNull(values.established_year),
    website_url: orNull(values.website_url),
    industry: orNull(values.industry),
    headquarters: orNull(values.headquarters),
    is_active: values.is_active,
  };
}
