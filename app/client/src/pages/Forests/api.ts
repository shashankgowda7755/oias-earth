/**
 * Forests module-local async loaders for the wizard's AutocompleteField pickers.
 *
 * Each returns AutocompleteOption[] (the shape AutocompleteField.loadOptions
 * expects). Auth is handled by the shared axios instance interceptor (raw token,
 * no `Bearer`). All loaders debounce inside AutocompleteField — we just fetch.
 *
 *   - Species: POST /api/v1/master-plantspecies/search via shared `speciesSearch`.
 *   - Site Manager: employee/list   - Sponsor: sponsors/list   - User: users/list
 *     (server-side search via the confirmed list body {page,limit,search}).
 */
import { listEntity, speciesSearch } from '@/lib/api';
import type { AutocompleteOption } from '@/components';
import type { EmployeeRow, SponsorRow, UserRow } from '@/types/entities';

const PAGE = 1;
const LIMIT = 20;

/**
 * A single plant-species record from the catalog search. The live catalog
 * (MasterPlantspecy) carries far more columns; we read just enough to label it.
 * TODO(spec openQuestions[6]): the exact per-species fields the forest job
 * persists (oxygen levels, growth rate, etc.) are not captured here — we only
 * reference species by id + count, which is what EditBoxDialog collects.
 */
interface SpeciesRecord {
  id?: number | string;
  speciesName?: string | null;
  species_name?: string | null;
  commonName?: string | null;
  common_name?: string | null;
  name?: string | null;
}

function speciesLabel(s: SpeciesRecord): string {
  return (
    s.speciesName ||
    s.species_name ||
    s.commonName ||
    s.common_name ||
    s.name ||
    String(s.id ?? '')
  );
}

/** Species typeahead (forest wizard EditBoxDialog). */
export async function loadSpeciesOptions(query: string): Promise<AutocompleteOption[]> {
  const rows = await speciesSearch<SpeciesRecord>(query);
  return rows
    .filter((s): s is SpeciesRecord & { id: string | number } => s.id != null)
    .map((s) => {
      const common = s.commonName || s.common_name;
      return {
        value: String(s.id),
        label: speciesLabel(s),
        ...(common ? { description: common } : {}),
      };
    });
}

/** Site Manager picker (employees). */
export async function loadEmployeeOptions(query: string): Promise<AutocompleteOption[]> {
  const res = await listEntity<EmployeeRow>('employee', {
    page: PAGE,
    limit: LIMIT,
    ...(query ? { search: query } : {}),
  });
  return res.rows.map((e) => ({
    value: e.id,
    label: e.name,
    ...(e.designation ? { description: e.designation } : {}),
  }));
}

/** Sponsor picker (multi-select-backed). */
export async function loadSponsorOptions(query: string): Promise<AutocompleteOption[]> {
  const res = await listEntity<SponsorRow>('sponsors', {
    page: PAGE,
    limit: LIMIT,
    ...(query ? { search: query } : {}),
  });
  return res.rows.map((s) => ({
    value: s.id,
    label: s.sponsor_name,
    ...(s.industry ? { description: s.industry } : {}),
  }));
}

/**
 * User picker. The forest contract grants portal access by `user_role_id` (the
 * user_roles join-row uuid), so the option VALUE is that id — not the profile id.
 * Rows without a user_role_id can't be granted access, so they're skipped.
 */
export async function loadUserOptions(query: string): Promise<AutocompleteOption[]> {
  const res = await listEntity<UserRow>('users', {
    page: PAGE,
    limit: LIMIT,
    ...(query ? { search: query } : {}),
  });
  return res.rows
    .filter((u) => Boolean(u.user_role_id))
    .map((u) => {
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
      return {
        value: String(u.user_role_id),
        label: name || u.username,
        ...(name && u.username ? { description: u.username } : {}),
      };
    });
}
