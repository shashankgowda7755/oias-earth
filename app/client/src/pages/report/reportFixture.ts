/**
 * Phase-1 / pilot previews: build a ForestReportData from a bundled sample JSON
 * (the exact create-payload shape) so /report/forest/preview renders the real
 * field mapping with no server/auth. `?src=` selects which sample:
 *   - vandalur (default) — the original blank-ish sample
 *   - annasaheb — the CGI Anna Saheb School (Pune) pilot extraction, fiscal Q3 2025
 * Empty fields render blank/— so mapping mistakes are obvious.
 */
import vandalur from './vandalur.sample.json';
import annasaheb from './annasaheb.sample.json';
import cgiblr from './cgiblr.sample.json';
import type { FullForestPayload } from '../Forests/fullTypes';
import { buildMeta, computeReport } from './reportCompute';
import type { ForestReportData } from './reportTypes';

interface PreviewDef {
  payload: unknown;
  year: number;
  quarter: number;
  report_date: string;
  created_by_name?: string;
  created_by_phone?: string;
}

const PREVIEWS: Record<string, PreviewDef> = {
  vandalur: { payload: vandalur, year: 2026, quarter: 1, report_date: '24 June 2026' },
  annasaheb: {
    payload: annasaheb, year: 2025, quarter: 3, report_date: 'December 2025',
    created_by_name: 'Mehafooz', created_by_phone: '9790968326',
  },
  cgiblr: {
    payload: cgiblr, year: 2026, quarter: 1, report_date: 'June 2026',
  },
};

export function buildPreviewReport(src = 'vandalur'): ForestReportData {
  const def = PREVIEWS[src] ?? PREVIEWS.vandalur!;
  const forest = def.payload as FullForestPayload;
  return {
    meta: buildMeta(forest, def.year, def.quarter, {
      report_date: def.report_date,
      created_by_name: def.created_by_name,
      created_by_phone: def.created_by_phone,
    }),
    forest,
    computed: computeReport(forest, def.year, def.quarter),
  };
}
