/**
 * Server-side builder for the quarterly forest report (GET /public/forest/:id/report).
 * Returns the SAME ForestReportData shape the client renderer consumes
 * ({ meta, forest, computed }) — the renderer never recomputes, it only reads.
 *
 * - forest: whitelisted scalar columns (no PII/internal ids) + parse-guarded jsonb,
 *   with the DB's singular grid columns mapped to the payload's plural names.
 * - computed: actual per-species sapling counts + rates (from forest_trees ⋈
 *   master_plantspecies), maintenance/workforce/growth/value/site-plan rolled up
 *   from the jsonb. Oxygen/carbon use the PDF's documented method: per-species
 *   per-day rate × 365 × count × 25% counted; value at ₹20/kg. Estimated, never
 *   "credit".
 */
import { query } from '../db';
import { notFound } from '../errors';
export { festivalHolidaysInQuarter } from './holidays';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COUNTED = 0.25;

type Row = Record<string, unknown>;

const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function parseJson<T>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') { try { return JSON.parse(v) as T; } catch { return undefined; } }
  return v as T;
}

// FISCAL quarters (Indian FY, Apr-start): Q1 Apr–Jun … Q4 Jan–Mar (next cal year).
const FQ_START_MONTH: Record<number, number> = { 1: 3, 2: 6, 3: 9, 4: 0 };
const fqCalYear = (fy: number, q: number): number => (q === 4 ? fy + 1 : fy);

function daysInQuarter(year: number, q: number): number {
  const start = FQ_START_MONTH[q] ?? 0;
  const calYear = fqCalYear(year, q);
  let d = 0;
  for (let m = start; m < start + 3; m++) d += new Date(calYear, m + 1, 0).getDate();
  return d;
}

/**
 * Sundays (the default weekly off) in a fiscal quarter — derived so the operator
 * never types the weekly-off count. Used as the fallback when an entry omits
 * `total_holidays_weekly_off`; an explicit value still overrides it.
 */
function sundaysInQuarter(year: number, q: number): number {
  const start = FQ_START_MONTH[q] ?? 0;
  const calYear = fqCalYear(year, q);
  const to = new Date(calYear, start + 3, 0);
  let count = 0;
  for (const d = new Date(calYear, start, 1); d <= to; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) count += 1;
  }
  return count;
}

/** Weekly-off for an entry: explicit value if given, else the quarter's Sundays. */
function weeklyOffOf(e: MaintQ): number {
  return e.total_holidays_weekly_off != null ? num(e.total_holidays_weekly_off) : sundaysInQuarter(e.year, e.quarter);
}

function quarterPeriodLabel(year: number, q: number): string {
  const start = FQ_START_MONTH[q] ?? 0;
  return `${MONTHS[start]} – ${MONTHS[start + 2]} ${String(fqCalYear(year, q)).slice(-2)}`;
}

const FOREST_SCALARS = [
  'id', 'forest_name', 'forest_desc', 'forest_unique_id', 'forest_geo_lat', 'forest_geo_long',
  'forest_address', 'forest_city', 'forest_state', 'forest_country',
  'box_rows', 'box_column', 'box_to_box_distance', 'tree_row', 'tree_column', 'tree_to_tree_distance',
  'direction_angle', 'boundary_gap', 'pathway_spacing', 'project_site', 'project_period', 'plantation_date',
  'plantation_strategy', 'plantation_strategy_other', 'irrigation_method', 'irrigation_method_other',
  'climate', 'climate_other', 'soil_type', 'soil_type_other', 'permission_letter', 'site_layout',
  'digipin', 'last_inspection_date',
];
const FOREST_JSONB = [
  'land_ownership', 'land_area', 'authorization_details', 'area_population_statistics_details',
  'direct_and_indirect_beneficiaries', 'forest_value_flow_impact_report', 'species_details',
  'maintenance_workforce', 'plant_growth_data', 'soil_ph_level', 'temperature_humidity',
  'environmental_need_indicators', 'security_and_infrastructure', 'plantation_progress',
  'additional_sponsor_logo', 'dashboard_images', 'report_images', 'gallery_images',
];

/** Map a forests row → the FullForestPayload field names the slides read. */
function mapForest(row: Row): Row {
  const f: Row = {
    id: row.id,
    forest_name: row.forest_name, forest_desc: row.forest_desc, forest_unique_id: row.forest_unique_id,
    forest_geo_lat: row.forest_geo_lat, forest_geo_long: row.forest_geo_long,
    forest_address: row.forest_address, forest_city: row.forest_city, forest_state: row.forest_state, forest_country: row.forest_country,
    // DB grid columns are SINGULAR — expose the plural payload names.
    box_rows: row.box_rows, box_columns: row.box_column,
    tree_rows: row.tree_row, tree_columns: row.tree_column,
    box_to_box_distance: row.box_to_box_distance, tree_to_tree_distance: row.tree_to_tree_distance,
    direction_angle: row.direction_angle, boundary_gap: row.boundary_gap, pathway_spacing: row.pathway_spacing,
    project_site: row.project_site, project_period: row.project_period, plantation_date: row.plantation_date,
    plantation_strategy: row.plantation_strategy, plantation_strategy_other: row.plantation_strategy_other,
    irrigation_method: row.irrigation_method, irrigation_method_other: row.irrigation_method_other,
    climate: row.climate, climate_other: row.climate_other, soil_type: row.soil_type, soil_type_other: row.soil_type_other,
    digipin: row.digipin, last_inspection_date: row.last_inspection_date,
    permission_letter: row.permission_letter, site_layout: row.site_layout,
  };
  for (const k of FOREST_JSONB) f[k] = parseJson(row[k]) ?? null;
  return f;
}

interface MaintQ { year: number; quarter: number; total_holidays_weekly_off?: number; total_holidays_festival?: number; total_watering_days?: number; total_raining_days?: number; full_time_gardeners?: number; part_time_gardeners?: number; total_part_time_labour_days?: number }

function maintenanceRollup(entries: MaintQ[], year: number, q: number, tillDate: boolean) {
  const rows = tillDate ? entries.filter((e) => e.year < year || (e.year === year && e.quarter <= q)) : entries.filter((e) => e.year === year && e.quarter === q);
  if (rows.length === 0) return null;
  let total = 0, weekly_off = 0, festival = 0, watering = 0, rainy = 0;
  for (const e of rows) { total += daysInQuarter(e.year, e.quarter); weekly_off += weeklyOffOf(e); festival += num(e.total_holidays_festival); watering += num(e.total_watering_days); rainy += num(e.total_raining_days); }
  return { total_days: total, working_days: Math.max(0, total - weekly_off - festival), watering_days: watering, rainy_days: rainy, not_watered_days: Math.max(0, total - watering - rainy), weekly_off, festival };
}

function workforceRollup(entries: MaintQ[], year: number, q: number, tillDate: boolean) {
  const rows = tillDate ? entries.filter((e) => e.year < year || (e.year === year && e.quarter <= q)) : entries.filter((e) => e.year === year && e.quarter === q);
  if (rows.length === 0) return null;
  let total_days = 0, weekly_off = 0, festival = 0, ft_hours = 0, pt_hours = 0, ft_labour_days = 0, pt_labour_days = 0, ft_gardeners = 0, pt_gardeners = 0;
  for (const e of rows) {
    const total = daysInQuarter(e.year, e.quarter);
    const wOff = weeklyOffOf(e), fest = num(e.total_holidays_festival);
    const working = Math.max(0, total - wOff - fest);
    const ftG = num(e.full_time_gardeners), ptG = num(e.part_time_gardeners), ptDays = num(e.total_part_time_labour_days);
    total_days += total; weekly_off += wOff; festival += fest; ft_labour_days += working; pt_labour_days += ptDays;
    ft_gardeners = Math.max(ft_gardeners, ftG); pt_gardeners = Math.max(pt_gardeners, ptG);
    ft_hours += working * 8 * ftG; pt_hours += ptDays * 9 * ptG;
  }
  const total_hours = ft_hours + pt_hours;
  return {
    total_hours, ft_share_pct: total_hours ? Math.round((ft_hours / total_hours) * 1000) / 10 : 0, pt_share_pct: total_hours ? Math.round((pt_hours / total_hours) * 1000) / 10 : 0,
    ft_hours, pt_hours, ft_gardeners, pt_gardeners, ft_labour_days, pt_labour_days, total_days, working_days: Math.max(0, total_days - weekly_off - festival), weekly_off, festival,
  };
}

function growthMilestones(forest: Row) {
  const pg = forest.plant_growth_data as { target_height_range?: { year: number; min?: number; max?: number }[] } | null;
  const targets = (pg?.target_height_range ?? []).slice().sort((a, b) => a.year - b.year);
  if (targets.length === 0) return [];
  const pd = forest.plantation_date ? new Date(String(forest.plantation_date)) : null;
  // Clamp heights to a sane ceiling so a data typo ("84" for "14") can't render.
  const ft = (v: number): number => Math.max(0, Math.min(30, v));
  return targets.map((t) => ({
    label: t.year === 0 ? 'Year 0' : `End of Year ${t.year}`,
    range: t.min != null && t.max != null ? `${ft(t.min)}–${ft(t.max)} Feet` : '—',
    date: pd ? `${MONTHS[pd.getMonth()]}- ${pd.getFullYear() + t.year}` : '—',
    current: t.year === 0,
  }));
}

function currentHeightLabel(forest: Row): string | null {
  const pg = forest.plant_growth_data as { actual_height_range?: { year: number; quarter: number; min?: number; max?: number }[] } | null;
  const a = (pg?.actual_height_range ?? []).slice().sort((x, y) => x.year - y.year || x.quarter - y.quarter);
  const last = a[a.length - 1];
  const ft = (v: number): number => Math.max(0, Math.min(30, v));
  return last && last.min != null && last.max != null ? `${ft(last.min)}–${ft(last.max)} Feet` : null;
}

function siteMasterPlan(forest: Row, plantedTotal: number) {
  // DB columns are singular (box_column / tree_row / tree_column); accept the
  // plural aliases too. Reading the wrong name left this slide blank for forests.
  const boxRows = num(forest.box_rows);
  const boxCols = num(forest.box_column ?? forest.box_columns);
  const treeRows = num(forest.tree_row ?? forest.tree_rows);
  const treeCols = num(forest.tree_column ?? forest.tree_columns);
  const boxCount = boxRows * boxCols;
  if (!boxCount && !treeRows) return null;
  const perMatrix = treeRows * treeCols;
  return {
    box_count: boxCount || 0,
    // ACTUAL planted total first — projected grid capacity (boxCount × perMatrix)
    // overcounts (e.g. 4,200 vs the real 670). Fall back to capacity only if 0.
    total_saplings: plantedTotal || (boxCount || 0) * perMatrix,
    grid_label: boxRows && boxCols ? `${boxRows} × ${boxCols}` : '—',
    per_matrix_label: treeRows && treeCols ? `${treeRows} × ${treeCols} = ${perMatrix} Nos` : '—',
    spacing_grids: forest.box_to_box_distance as number | undefined,
    spacing_plants: forest.tree_to_tree_distance as number | undefined,
    spacing_pathway: forest.pathway_spacing as number | undefined,
  };
}

function valueNet(t?: { land_value?: number; tree_value?: number; oxygen_generated?: number; carbon_sequestration?: number }): number | null {
  if (!t) return null;
  const vals = [t.land_value, t.tree_value, t.oxygen_generated, t.carbon_sequestration];
  if (vals.every((v) => v == null)) return null;
  return vals.reduce<number>((s, v) => s + num(v), 0);
}

export async function buildForestReport(forestId: string, year: number, quarter: number) {
  const fr = await query<Row>(
    `SELECT ${[...FOREST_SCALARS, ...FOREST_JSONB].join(', ')} FROM forests WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [forestId],
  );
  const forestRow = fr.rows[0];
  if (fr.rowCount === 0 || !forestRow) throw notFound('Forest not found');
  const forest = mapForest(forestRow);

  // Supervisor (site manager): the report used to hard-code "—". Surface the
  // assigned employee's name.
  const empRes = await query<{ name: string }>(
    `SELECT e.name FROM forests_employees fe JOIN employees e ON e.id = fe.employee_id
      WHERE fe.forest_id = $1 AND fe.is_active = TRUE ORDER BY fe.created_at LIMIT 1`,
    [forestId],
  );
  const supervisor = (empRes.rows[0]?.name as string) || undefined;

  // Sponsor name+logo must always show. If the richer additional_sponsor_logo
  // block wasn't filled, fall back to the linked sponsors (sponsor picker).
  if (((forest.additional_sponsor_logo as unknown[]) ?? []).length === 0) {
    const spRes = await query<{ sponsor_name: string; sponsor_logo: string | null }>(
      `SELECT s.sponsor_name, s.sponsor_logo FROM forest_sponsors fs JOIN sponsors s ON s.id = fs.sponsor_id
        WHERE fs.forest_id = $1 AND fs.is_active = TRUE ORDER BY fs.created_at`,
      [forestId],
    );
    if (spRes.rows.length) {
      forest.additional_sponsor_logo = spRes.rows.map((s) => ({
        type: { label: 'Sponsored by', value: 'sponsored_by' },
        name: s.sponsor_name,
        logo: s.sponsor_logo ?? undefined,
      }));
    }
  }

  // Per-box species breakdown (granular planting layout for the Site Master Plan).
  const boxRes = await query<{ id: string; row: number | null; column: number | null; prefix: string | null }>(
    `SELECT id, "row", "column", prefix FROM forest_boxes WHERE forest_id = $1 ORDER BY "row", "column"`,
    [forestId],
  );
  const site_plan_boxes: { label: string; species: { name: string; count: number }[] }[] = [];
  for (const b of boxRes.rows) {
    const bs = await query<{ name: string; count: number }>(
      `SELECT COALESCE(mp.common_name, mp.species_name, 'Species ' || ft.master_plant_species_id) AS name,
              COUNT(ft.id)::int AS count
         FROM forest_trees ft LEFT JOIN master_plantspecies mp ON mp.id = ft.master_plant_species_id
        WHERE ft.box_id = $1 AND ft.is_active = TRUE
        GROUP BY 1 ORDER BY count DESC`,
      [b.id],
    );
    if (bs.rows.length === 0) continue;
    const rc = b.row != null && b.column != null ? ` (${b.row}-${b.column})` : '';
    site_plan_boxes.push({
      label: `${(b.prefix as string) || 'Box'}${rc}`,
      species: bs.rows.map((r) => ({ name: String(r.name), count: num(r.count) })),
    });
  }

  // Actual per-species sapling counts + rates + traits + description.
  const sr = await query<Row>(
    `SELECT ft.master_plant_species_id AS species_id,
            COALESCE(sp.common_name, sp.species_name) AS common_name,
            sp.species_name, sp.species_desc,
            sp.oxygen_per_day, sp.carbon_offset_per_day,
            sp.is_timber_production, sp.is_flowering_plant, sp.is_nesting_habitat, sp.is_fruit_bearing,
            COUNT(ft.id)::int AS count
       FROM forest_trees ft
       LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
      WHERE ft.forest_id = $1 AND ft.is_active = TRUE
      GROUP BY ft.master_plant_species_id, sp.common_name, sp.species_name, sp.species_desc,
               sp.oxygen_per_day, sp.carbon_offset_per_day,
               sp.is_timber_production, sp.is_flowering_plant, sp.is_nesting_habitat, sp.is_fruit_bearing
      ORDER BY count DESC`,
    [forestId],
  );

  const species_inventory = sr.rows.map((r) => {
    const count = num(r.count);
    return {
      common_name: String(r.common_name ?? `Species ${r.species_id}`),
      species_name: r.species_name as string | undefined,
      saplings: count,
      description: (r.species_desc as string) || undefined,
      traits: {
        timber: Boolean(r.is_timber_production),
        pollination: Boolean(r.is_flowering_plant),
        nesting: Boolean(r.is_nesting_habitat),
        fruit: Boolean(r.is_fruit_bearing),
      },
      oxygen_kg_year: Math.round(num(r.oxygen_per_day) * 365 * count * COUNTED),
      carbon_kg_year: Math.round(num(r.carbon_offset_per_day) * 365 * count * COUNTED),
    };
  });
  const total = species_inventory.reduce((s, x) => s + x.saplings, 0);
  const o2_100 = species_inventory.reduce((s, x) => s + x.oxygen_kg_year, 0);
  const co2_100 = species_inventory.reduce((s, x) => s + x.carbon_kg_year, 0);

  // Derive survival/mortality from tagged tree status (1=Healthy,2=Drying,
  // 3=Damaged,4=Dead) so health/mortality need not be typed. Surfaced as a
  // suggestion the operator can override; null when no trees are tagged.
  const statusAgg = await query<Row>(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE COALESCE(tree_status_id, 1) = 4)::int AS dead
       FROM forest_trees WHERE forest_id = $1 AND is_active = TRUE`,
    [forestId],
  );
  const treesTotal = num(statusAgg.rows[0]?.total);
  const treesDead = num(statusAgg.rows[0]?.dead);
  const derived_mortality_rate = treesTotal > 0 ? Math.round((treesDead / treesTotal) * 1000) / 10 : null;
  const alivePct = treesTotal > 0 ? ((treesTotal - treesDead) / treesTotal) * 100 : null;
  const derived_health: 'good' | 'average' | 'poor' | null =
    alivePct == null ? null : alivePct >= 95 ? 'good' : alivePct >= 85 ? 'average' : 'poor';

  const vf = forest.forest_value_flow_impact_report as { short_term?: object; medium_term?: object; long_term?: object } | null;
  const maint = (forest.maintenance_workforce as MaintQ[]) ?? [];

  const computed = {
    total_saplings: total,
    species_count: species_inventory.length,
    species_inventory,
    // Derived survival (overridable suggestion; null when no trees are tagged).
    alive_trees: treesTotal > 0 ? treesTotal - treesDead : null,
    dead_trees: treesTotal > 0 ? treesDead : null,
    derived_mortality_rate,
    derived_health,
    value_flow: {
      short: valueNet((vf?.short_term as never)),
      medium: valueNet((vf?.medium_term as never)),
      long: valueNet((vf?.long_term as never)),
    },
    approx_value_100: total > 0 ? { saplings: total, oxygen_kg_year: o2_100, carbon_kg_year: co2_100 } : null,
    approx_value_75: total > 0 ? { saplings: Math.round(total * 0.75), oxygen_kg_year: Math.round(o2_100 * 0.75), carbon_kg_year: Math.round(co2_100 * 0.75) } : null,
    maintenance_quarter: maintenanceRollup(maint, year, quarter, false),
    maintenance_tilldate: maintenanceRollup(maint, year, quarter, true),
    workforce_quarter: workforceRollup(maint, year, quarter, false),
    workforce_tilldate: workforceRollup(maint, year, quarter, true),
    growth_milestones: growthMilestones(forest),
    current_height_label: currentHeightLabel(forest),
    site_master_plan: siteMasterPlan(forest, total),
    site_plan_boxes,
  };

  const logos = (forest.additional_sponsor_logo as { type?: { value?: string }; name?: string; logo?: string }[]) ?? [];
  const sponsored = logos.find((l) => l.type?.value === 'sponsored_by');
  const initiated = logos.find((l) => l.type?.value === 'initiated_by');
  const pd = forest.plantation_date ? new Date(String(forest.plantation_date)) : null;
  const meta = {
    year, quarter,
    quarter_label: `Q${quarter}`,
    period_label: quarterPeriodLabel(year, quarter),
    report_date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    plantation_label: pd ? `${MONTHS[pd.getMonth()]} ${pd.getFullYear()}` : '—',
    supervisor,
    client_name: sponsored?.name,
    client_logo: sponsored?.logo,
    communitree_logo: initiated?.logo,
  };

  return { meta, forest, computed };
}
