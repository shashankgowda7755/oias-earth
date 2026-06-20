/**
 * Resolve a species name (common or botanical, any case/spacing) to a
 * master_plantspecies.id. Client reports use common names that don't always
 * match our canonical common_name, so an alias map widens the match. Returns
 * null when unknown — callers decide whether to skip the row or flag it.
 */
import { query } from '../db';

// report-name (lowercased) -> extra names to try against common_name/species_name
const ALIASES: Record<string, string[]> = {
  'indian gooseberry': ['amla', 'nelli', 'phyllanthus emblica', 'emblica officinalis'],
  sitafal: ['custard apple', 'sugar apple', 'sitaphal', 'annona squamosa'],
  karanj: ['indian beech', 'pongam', 'pongamia', 'pongamia pinnata', 'millettia pinnata'],
  'indian almond': ['terminalia catappa', 'country almond', 'badam'],
  arjun: ['arjuna', 'terminalia arjuna'],
  jamun: ['java plum', 'black plum', 'naval', 'syzygium cumini'],
  guava: ['psidium guajava'],
  pomegranate: ['anar', 'punica granatum'],
  teak: ['tectona grandis', 'sagwan'],
  neem: ['azadirachta indica'],
  mango: ['mangifera indica'],
};

export async function resolveSpeciesId(name: string): Promise<number | null> {
  const raw = String(name || '').trim();
  if (!raw) return null;
  const candidates = [raw, ...(ALIASES[raw.toLowerCase()] || [])];
  for (const c of candidates) {
    const r = await query<{ id: number }>(
      `SELECT id FROM master_plantspecies
        WHERE lower(trim(common_name)) = lower(trim($1))
           OR lower(trim(species_name)) = lower(trim($1))
        ORDER BY id LIMIT 1`,
      [c],
    );
    if (r.rowCount) return r.rows[0]!.id;
  }
  // Last resort: loose contains match on common_name (e.g. "Arjun" in "Arjun Tree").
  const loose = await query<{ id: number }>(
    `SELECT id FROM master_plantspecies
      WHERE common_name ILIKE '%' || $1 || '%' OR species_name ILIKE '%' || $1 || '%'
      ORDER BY length(common_name) ASC LIMIT 1`,
    [raw],
  );
  return loose.rowCount ? loose.rows[0]!.id : null;
}
