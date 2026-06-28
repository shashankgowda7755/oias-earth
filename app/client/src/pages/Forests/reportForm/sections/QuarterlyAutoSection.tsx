/**
 * Quarterly Observation (auto) — the ONE-PERSON quarterly entry surface.
 *
 * Goal: stop 10 people re-typing everything each quarter. For a chosen
 * year+quarter this section:
 *   - AUTO-fills weather (raining days + OUTSIDE temp/humidity) from Open-Meteo
 *     via GET /forest/:id/weather (no typing).
 *   - asks only for the handful of fields a human must MEASURE on site:
 *     inside-plantation temp/humidity (the cooling differentiator), soil-pH
 *     meter reading, current plant height.
 * Everything else (saplings, species, O2/carbon, workforce, value, site plan)
 * is computed by the report engine and never entered here.
 *
 * It writes into the same jsonb arrays the report reads (maintenance_workforce,
 * temperature_humidity, soil_ph_level, plant_growth_data.actual_height_range),
 * upserting the row for the selected (year, quarter).
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SectionShell, FieldGrid, Num, type SectionProps } from '../kit';
import { fetchForestWeather, type ForestWeather } from '../../forestApi';

type Row = Record<string, unknown> & { year?: number; quarter?: number };

/** Find-or-create the (year,quarter) row in a jsonb array, returning a new array. */
function upsertRow(arr: unknown, year: number, quarter: number, mut: (r: Row) => Row): Row[] {
  const list: Row[] = Array.isArray(arr) ? [...(arr as Row[])] : [];
  const i = list.findIndex((r) => Number(r.year) === year && Number(r.quarter) === quarter);
  if (i >= 0) list[i] = mut({ ...list[i] });
  else list.push(mut({ year, quarter }));
  return list;
}

/** Read the current (year,quarter) row from a jsonb array. */
function findRow(arr: unknown, year: number, quarter: number): Row | undefined {
  if (!Array.isArray(arr)) return undefined;
  return (arr as Row[]).find((r) => Number(r.year) === year && Number(r.quarter) === quarter);
}

function defaultFiscal(): { year: number; quarter: number } {
  const d = new Date();
  const m = d.getMonth(); // 0-11
  // Fiscal: Q1 Apr-Jun(3-5), Q2 Jul-Sep(6-8), Q3 Oct-Dec(9-11), Q4 Jan-Mar(0-2 -> prev FY)
  if (m >= 3 && m <= 5) return { year: d.getFullYear(), quarter: 1 };
  if (m >= 6 && m <= 8) return { year: d.getFullYear(), quarter: 2 };
  if (m >= 9) return { year: d.getFullYear(), quarter: 3 };
  return { year: d.getFullYear() - 1, quarter: 4 };
}

export function QuarterlyAutoSection({ draft, patch, onQuarterChange }: SectionProps) {
  const { id = '' } = useParams();
  const fiscal = defaultFiscal();
  const [year, setYear] = useState(fiscal.year);
  const [quarter, setQuarter] = useState(fiscal.quarter);

  useEffect(() => { onQuarterChange?.(fiscal.quarter); }, []); // sync initial quarter to parent
  const [wx, setWx] = useState<ForestWeather | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const tempRow = findRow(draft.temperature_humidity, year, quarter);
  const phRow = findRow(draft.soil_ph_level, year, quarter);
  const inside = (tempRow?.inside_plantation as { temperature?: number; humidity?: number }) ?? {};

  const setInside = (key: 'temperature' | 'humidity', v: number | undefined) => {
    patch({
      temperature_humidity: upsertRow(draft.temperature_humidity, year, quarter, (r) => ({
        ...r,
        inside_plantation: { ...(r.inside_plantation as object), [key]: v },
      })),
    } as Partial<typeof draft>);
  };

  const setPh = (v: number | undefined) => {
    patch({
      soil_ph_level: upsertRow(draft.soil_ph_level, year, quarter, (r) => ({ ...r, meter_reading: v })),
    } as Partial<typeof draft>);
  };

  const autoFillWeather = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const w = await fetchForestWeather(id, year, quarter);
      setWx(w);
      if (!w.available) {
        setMsg(w.reason || 'No weather data for this quarter yet.');
        return;
      }
      // Stamp the auto-filled values as estimated (Open-Meteo) so the renderer
      // can label them and they survive the report-data Save. Inside readings
      // are never written here — they stay manual on-site measurements.
      const stamp = { source: 'open-meteo', estimated: true };
      patch({
        maintenance_workforce: upsertRow(draft.maintenance_workforce, year, quarter, (r) => ({
          ...r,
          total_raining_days: w.raining_days,
          _weather: stamp,
        })),
        temperature_humidity: upsertRow(draft.temperature_humidity, year, quarter, (r) => ({
          ...r,
          outside_plantation: {
            ...(r.outside_plantation as object),
            temperature: w.outside_temperature_avg ?? undefined,
            humidity: w.outside_humidity_avg ?? undefined,
            estimated: true,
            source: 'open-meteo',
          },
        })),
      } as Partial<typeof draft>);
      setMsg(
        `Filled from Open-Meteo (${w.period?.start} → ${w.period?.end}): ${w.raining_days} rain days · ` +
          `outside ${w.outside_temperature_avg ?? '—'}°C / ${w.outside_humidity_avg ?? '—'}% · rainfall ${w.rainfall_mm ?? '—'}mm.`,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Weather fetch failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SectionShell
        title="Quarterly observation"
        desc="Pick the quarter, auto-fill weather, then enter only the few on-site measurements. Everything else is computed."
      >
        <FieldGrid cols={2}>
          <Num label="Project year (FY)" value={year} onChange={(v) => setYear(v ?? fiscal.year)} />
          <Num label="Quarter (1-4)" value={quarter} onChange={(v) => { const q = Math.min(4, Math.max(1, v ?? 1)); setQuarter(q); onQuarterChange?.(q); }} />
        </FieldGrid>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={autoFillWeather}
            disabled={busy}
            className="rounded-button bg-primary px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            {busy ? 'Fetching…' : '⚡ Auto-fill weather'}
          </button>
          {msg ? <span className="text-xs text-textSecondary">{msg}</span> : null}
        </div>
        {wx?.available ? (
          <>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-white/8 px-2 py-0.5 text-[11px] font-medium text-textSecondary">
              <span aria-hidden="true">●</span> Estimated · Open-Meteo · overridable
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-textSecondary sm:grid-cols-4">
              <div>Rain days: <b className="text-textPrimary">{wx.raining_days}</b></div>
              <div>Rainfall: <b className="text-textPrimary">{wx.rainfall_mm ?? '—'} mm</b></div>
              <div>Outside temp: <b className="text-textPrimary">{wx.outside_temperature_avg ?? '—'}°C</b></div>
              <div>Outside humidity: <b className="text-textPrimary">{wx.outside_humidity_avg ?? '—'}%</b></div>
            </div>
          </>
        ) : null}
      </SectionShell>

      <SectionShell
        title="On-site measurements (manual)"
        desc="The only readings a person must take in the field — these are what the report compares against the outside weather above."
      >
        <FieldGrid cols={2}>
          <Num label="Inside-plantation temperature (°C)" value={inside.temperature ?? undefined} onChange={(v) => setInside('temperature', v)} min={-20} max={60} />
          <Num label="Inside-plantation humidity (%)" value={inside.humidity ?? undefined} onChange={(v) => setInside('humidity', v)} min={0} max={100} />
          <Num label="Soil pH meter reading" value={(phRow?.meter_reading as number) ?? undefined} onChange={setPh} min={0} max={14} helperText="Leave blank if not measured (0 is not a valid pH)." />
        </FieldGrid>
      </SectionShell>
    </>
  );
}
