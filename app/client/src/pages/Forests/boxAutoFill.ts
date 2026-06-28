import { genBoxLetter, boxPrefix } from './treeId';
import type { BoxConfig, GlobalSpeciesRow } from './types';

export interface AutoFillParams {
  totalTrees: number;
  speciesMix: GlobalSpeciesRow[];
  boxRows: number;
  boxColumn: number;
  capacity: number;
  clientCode: string;
  forestCode: string;
  existingBoxes?: Record<string, BoxConfig>;
}

export function autoFillBoxes({
  totalTrees,
  speciesMix,
  boxRows,
  boxColumn,
  capacity,
  clientCode,
  forestCode,
  existingBoxes = {},
}: AutoFillParams): Record<string, BoxConfig> {
  const result: Record<string, BoxConfig> = {};
  let remaining = Math.max(0, totalTrees);
  let idx = 0;

  for (let r = 1; r <= boxRows; r++) {
    for (let c = 1; c <= boxColumn; c++) {
      const key = `${r}-${c}`;
      const existing = existingBoxes[key];

      if (existing?.overridden) {
        result[key] = existing;
        remaining -= existing.species.reduce((s, sp) => s + (Number(sp.count) || 0), 0);
        idx++;
        continue;
      }

      const count = Math.min(capacity, Math.max(0, remaining));
      remaining -= count;
      const letter = genBoxLetter(idx);
      result[key] = {
        row: r,
        col: c,
        prefix: boxPrefix(clientCode, forestCode, letter),
        start_digits: '3',
        start: '001',
        species: count > 0 ? distributeSpecies(speciesMix, count, totalTrees) : [],
        box_lat: existing?.box_lat ?? '',
        box_lng: existing?.box_lng ?? '',
        overridden: false,
      };
      idx++;
    }
  }
  return result;
}

function distributeSpecies(
  mix: GlobalSpeciesRow[],
  boxCount: number,
  totalTrees: number,
): BoxConfig['species'] {
  if (mix.length === 0 || totalTrees <= 0) return [];
  const total = mix.reduce((s, m) => s + (Number(m.count) || 0), 0) || totalTrees;

  const items = mix.map(m => {
    const exact = (Number(m.count) / total) * boxCount;
    const floor = Math.floor(exact);
    return { species_id: m.species_id, species_label: m.species_label, floor, frac: exact - floor };
  });

  const rem = boxCount - items.reduce((s, i) => s + i.floor, 0);
  items.sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < rem && i < items.length; i++) items[i]!.floor++;

  return items
    .filter(m => m.floor > 0)
    .map(m => ({ species_id: m.species_id, species_label: m.species_label, count: String(m.floor) }));
}
