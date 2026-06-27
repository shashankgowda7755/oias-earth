/**
 * Slides 8–14: Forest Value Flow, Approximate Value, Maintenance Summary,
 * Workforce (Quarter + Till Date), Expected Growth, Site Master Plan.
 * Data + computed-driven, empty-safe.
 */
import type { ReactNode } from 'react';
import type { ImpactTermValues } from '../../Forests/fullTypes';
import type { MaintenanceRollup, SlideProps, WorkforceRollup } from '../reportTypes';
import {
  C, SectionTitle, SlidePage, StatCard, ValueBar, SplitBar, DarkPanel, ReportImage, EmptyBlock, CARD_SHADOW, numOrDash, dash,
} from '../reportPrimitives';

/* --------------------- Slide 8: Forest Value Flow --------------------- */
function valArr(t?: ImpactTermValues) {
  return [
    ['Land Value', t?.land_value], ['Tree Value', t?.tree_value],
    ['Oxygen Gen.', t?.oxygen_generated], ['Carbon Seq.', t?.carbon_sequestration],
  ] as [string, number | undefined][];
}
export function S08ValueFlow({ data }: SlideProps) {
  const { meta, forest, computed } = data;
  const vf = forest.forest_value_flow_impact_report;
  const terms = [
    { tag: 'SHORT TERM (3Y)', horizon: '3Y', net: computed.value_flow.short, vals: valArr(vf?.short_term), accent: C.green },
    { tag: 'MEDIUM TERM (5Y)', horizon: '5Y', net: computed.value_flow.medium, vals: valArr(vf?.medium_term), accent: C.blue },
    { tag: 'LONG TERM (10Y)', horizon: '10Y', net: computed.value_flow.long, vals: valArr(vf?.long_term), accent: C.amber },
  ];
  const max = Math.max(1, ...terms.flatMap((t) => t.vals.map(([, v]) => Number(v) || 0)));
  return (
    <SlidePage meta={meta}>
      <DarkPanel style={{ padding: '22px 26px', textAlign: 'center', marginBottom: 18 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 999, padding: '5px 14px', fontSize: 12, color: '#dff5e6' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green }} /> PROJECT: {dash(forest.forest_name)}
        </span>
        <h2 style={{ fontSize: 32, fontWeight: 700, margin: '10px 0 4px' }}>Forest Value Flow Impact Report</h2>
        <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.72)' }}>Economic and environmental valuation across short, medium, and long-term horizons.</div>
      </DarkPanel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, flex: 1 }}>
        {terms.map((t) => (
          <div key={t.tag} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ borderTop: `3px solid ${t.accent}`, borderRadius: '4px 4px 16px 16px', border: `1px solid ${C.line}`, borderTopColor: t.accent, padding: '14px 16px', background: '#fff', boxShadow: CARD_SHADOW }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', color: t.accent }}>{t.tag}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Net Impact Projection</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.ink }}>{t.net != null ? `₹${t.net.toFixed(2)} Cr` : '—'}</div>
            </div>
            {t.vals.map(([label, v]) => (
              <ValueBar key={label} label={label} value={v != null ? Number(v) : null} max={max} accent={t.accent} tag={t.horizon} />
            ))}
          </div>
        ))}
      </div>
    </SlidePage>
  );
}

/* --------------------- Slide 9: Approximate Forest Value --------------------- */
const kg = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)} t` : `${numOrDash(Math.round(n))} kg`);
const rupees = (kgVal: number) => `₹${numOrDash(Math.round(kgVal * 20))}`;
export function S09ApproxValue({ data }: SlideProps) {
  const { meta, computed } = data;
  const a100 = computed.approx_value_100;
  const a75 = computed.approx_value_75;
  const blockInner = (title: string, b: typeof a100, dark: boolean) => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10, color: dark ? 'rgba(255,255,255,.85)' : C.ink, fontWeight: 700 }}>
        <span>{title}</span><span>Saplings: {b ? numOrDash(b.saplings) : '—'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div><div style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,.6)' : C.muted }}>Oxygen / yr (25%)</div><div style={{ fontSize: 18, fontWeight: 700, color: dark ? '#fff' : C.ink }}>{b ? `${kg(b.oxygen_kg_year)} · ${rupees(b.oxygen_kg_year)}` : '—'}</div></div>
        <div><div style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,.6)' : C.muted }}>Carbon / yr (25%)</div><div style={{ fontSize: 18, fontWeight: 700, color: dark ? '#fff' : C.ink }}>{b ? `${kg(b.carbon_kg_year)} · ${rupees(b.carbon_kg_year)}` : '—'}</div></div>
      </div>
    </>
  );
  const block = (title: string, b: typeof a100, dark = false) => (
    dark
      ? <DarkPanel radius={14} style={{ padding: '14px 18px' }}>{blockInner(title, b, true)}</DarkPanel>
      : <div style={{ background: '#f4f7f9', color: C.ink, border: `1px solid ${C.line}`, borderRadius: 14, padding: '14px 18px' }}>{blockInner(title, b, false)}</div>
  );
  return (
    <SlidePage meta={meta}>
      <SectionTitle>Approximate Forest Value in 3, 5, 10 Years</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {block('Approximate Value for 100%', a100, true)}
        {block('Approximate Value for 75% Trees Survival', a75)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        <div>
          <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.06em', color: C.muted, marginBottom: 8 }}>Native Species Analysis</div>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead><tr style={{ background: '#f7faf8', color: C.muted, textAlign: 'left' }}>
                {['Species', 'Saplings', 'Oxygen/yr (25%)', 'Carbon/yr (25%)', 'Est. value'].map((h) => <th key={h} style={{ padding: '8px 12px', fontWeight: 600 }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {computed.species_inventory.length ? computed.species_inventory.map((s) => (
                  <tr key={s.common_name} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ padding: '7px 12px', fontWeight: 600, color: C.ink }}>{s.common_name}</td>
                    <td style={{ padding: '7px 12px' }}>{numOrDash(s.saplings)}</td>
                    <td style={{ padding: '7px 12px' }}>{kg(s.oxygen_kg_year)}</td>
                    <td style={{ padding: '7px 12px' }}>{kg(s.carbon_kg_year)}</td>
                    <td style={{ padding: '7px 12px', color: C.green, fontWeight: 700 }}>{rupees(s.oxygen_kg_year + s.carbon_kg_year)}</td>
                  </tr>
                )) : <tr><td colSpan={5} style={{ padding: 16, color: C.faint, textAlign: 'center' }}>No species data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ background: '#eef4fb', border: '1px solid #d7e6f7', borderRadius: 12, padding: '14px 16px', fontSize: 11.5, color: '#4a6a8a', lineHeight: 1.7 }}>
          <strong style={{ color: C.blue }}>Calculation Notes</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 16 }}>
            <li>Only 25% of O₂ generated and carbon sequestered considered. Cost of Oxygen &amp; Carbon Dioxide: Rs. 20 / Kg.</li>
            <li>Oxygen metrics use the standard NASA estimation for native deciduous species at median maturity.</li>
            <li>The 75% survival rate includes a −2.5% annual mortality buffer for the first 3 years.</li>
            <li style={{ color: C.muted }}>Estimated, verification-ready removal — not an issued carbon credit.</li>
          </ul>
        </div>
      </div>
    </SlidePage>
  );
}

/* --------------------- Slide 10: Maintenance Summary --------------------- */
function maintCards(m: MaintenanceRollup | null, tag: string) {
  const cells: [string, number | null][] = [
    ['Total Days', m?.total_days ?? null], ['Total Working Days', m?.working_days ?? null],
    ['Total Watering Days', m?.watering_days ?? null], ['Total Rainy Days', m?.rainy_days ?? null],
    ['Total Days Not Watered', m?.not_watered_days ?? null],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
      {cells.map(([l, v]) => (
        <div key={l} style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '14px 16px', background: '#fff', boxShadow: CARD_SHADOW }}>
          <div style={{ fontSize: 10.5, color: C.faint, textAlign: 'right' }}>{tag}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.ink }}>{v != null ? v : '—'}</div>
          <div style={{ fontSize: 11.5, color: C.muted }}>{l}</div>
        </div>
      ))}
    </div>
  );
}
function ratio(m: MaintenanceRollup | null) {
  if (!m || m.total_days === 0) return null;
  const w = Math.round((m.watering_days / m.total_days) * 100);
  const r = Math.round((m.rainy_days / m.total_days) * 100);
  return { w, r, n: Math.max(0, 100 - w - r) };
}
export function S10Maintenance({ data }: SlideProps) {
  const { meta, computed } = data;
  const q = computed.maintenance_quarter, t = computed.maintenance_tilldate;
  const rq = ratio(q), rt = ratio(t);
  const ratioCard = (period: string, days: number | undefined, r: ReturnType<typeof ratio>) => (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px', background: '#fff', boxShadow: CARD_SHADOW }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <strong style={{ fontSize: 14, color: C.ink }}>📋 Watering vs Weather Ratio</strong><span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>{period}</span>
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8 }}>Distribution ({days ?? '—'} Days)</div>
      {r ? <SplitBar segments={[{ pct: r.w, color: C.green, label: `${r.w}%` }, { pct: r.r, color: C.blue, label: `${r.r}%` }, { pct: r.n, color: '#cfd8d4', label: `${r.n}%` }]} />
        : <EmptyBlock label="No data" height={26} />}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11.5, color: C.muted }}>
        <span><span style={{ color: C.green }}>●</span> Watered</span><span><span style={{ color: C.blue }}>●</span> Rainy</span><span><span style={{ color: '#cfd8d4' }}>●</span> Not Watered</span>
      </div>
    </div>
  );
  return (
    <SlidePage meta={meta}>
      <SectionTitle eyebrow="Impact Report">Maintenance Summary</SectionTitle>
      <div style={{ fontSize: 12, color: C.muted, marginTop: -12, marginBottom: 10 }}>Quarter · {meta.period_label}</div>
      {maintCards(q, 'Quarter')}
      <div style={{ fontSize: 12, color: C.muted, margin: '18px 0 10px' }}>Till Date · up to {meta.period_label}</div>
      {maintCards(t, 'Till date')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 18, flex: 1 }}>
        {ratioCard(meta.period_label, q?.total_days, rq)}
        {ratioCard(`Till ${meta.period_label}`, t?.total_days, rt)}
      </div>
    </SlidePage>
  );
}

/* --------------------- Slides 11/12: Workforce --------------------- */
function WorkforceSlide({ data, w, periodTag }: SlideProps & { w: WorkforceRollup | null; periodTag: string }) {
  const { meta } = data;
  const timeRows: [string, number, string][] = [
    ['Working Days', w?.working_days ?? 0, C.green], ['Holidays: Weekly Off', w?.weekly_off ?? 0, C.amber], ['Holidays: Festivals & Others', w?.festival ?? 0, '#9b7fd4'],
  ].map(([l, v, c]) => [l as string, v as number, c as string]);
  const maxDays = Math.max(1, w?.total_days ?? 1);
  return (
    <SlidePage meta={meta}>
      <SectionTitle eyebrow={`Quarter ${meta.quarter} Impact Report`}>Workforce Contribution &amp; Effort Analysis</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ borderLeft: `4px solid ${C.green}`, background: '#f7faf8', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><div style={{ fontSize: 11.5, textTransform: 'uppercase', color: C.muted }}>Total Labour Impact · {periodTag}</div><div style={{ fontSize: 30, fontWeight: 800, color: C.ink }}>{w ? numOrDash(w.total_hours) : '—'}<span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}> Hrs</span></div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, fontWeight: 800, color: C.amber }}>{w ? `${w.ft_share_pct}%` : '—'}</div><div style={{ fontSize: 10.5, color: C.muted }}>FULL-TIME</div><div style={{ fontSize: 20, fontWeight: 800, color: C.green, marginTop: 4 }}>{w ? `${w.pt_share_pct}%` : '—'}</div><div style={{ fontSize: 10.5, color: C.muted }}>PART-TIME</div></div>
          </div>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: '14px 18px' }}>
            <strong style={{ fontSize: 14, color: C.ink }}>Effort Distribution &amp; Calculation</strong>
            <div style={{ margin: '12px 0' }}>
              {w && <SplitBar segments={[{ pct: w.ft_share_pct, color: C.amber, label: `${w.ft_share_pct}%` }, { pct: w.pt_share_pct, color: C.green, label: `${w.pt_share_pct}%` }]} />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0' }}>
              <span style={{ color: C.muted }}>Full-Time · {w ? `${w.ft_labour_days} labour-days @ 8h` : '—'}</span><strong>{w ? `${numOrDash(w.ft_hours)} hrs` : '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderTop: `1px solid ${C.line}` }}>
              <span style={{ color: C.muted }}>Part-Time · {w ? `${w.pt_labour_days} labour-days @ 9h` : '—'}</span><strong>{w ? `${numOrDash(w.pt_hours)} hrs` : '—'}</strong>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 11.5, textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>Time Distribution</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.ink, marginBottom: 12 }}>{w ? w.total_days : '—'}<span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}> Days</span></div>
            {timeRows.map(([l, v, c]) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}><span style={{ color: C.body }}>{l}</span><strong>{v}</strong></div>
                <div style={{ height: 6, borderRadius: 3, background: C.line }}><div style={{ width: `${(v / maxDays) * 100}%`, height: '100%', background: c, borderRadius: 3 }} /></div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['Full-Time Gardeners', w?.ft_gardeners], ['Full-Time Labour Days', w?.ft_labour_days], ['Part-Time Gardeners', w?.pt_gardeners], ['Part-Time Labour Days', w?.pt_labour_days]].map(([l, v]) => (
              <div key={l as string} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.ink }}>{v != null ? String(v).padStart(2, '0') : '—'}</div>
                <div style={{ fontSize: 10.5, textTransform: 'uppercase', color: C.muted, marginTop: 2 }}>{l as string}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlidePage>
  );
}
export function S11WorkforceQuarter({ data }: SlideProps) {
  return <WorkforceSlide data={data} w={data.computed.workforce_quarter} periodTag={data.meta.period_label} />;
}
export function S12WorkforceTillDate({ data }: SlideProps) {
  return <WorkforceSlide data={data} w={data.computed.workforce_tilldate} periodTag={`Till ${data.meta.period_label}`} />;
}

/* --------------------- Slide 13: Expected Plant Growth --------------------- */
export function S13Growth({ data }: SlideProps) {
  const { meta, computed } = data;
  const ms = computed.growth_milestones;
  const maxH = Math.max(1, ...ms.map((m) => { const n = parseFloat(m.range); return Number.isFinite(n) ? n : 0; }));
  return (
    <SlidePage meta={meta}>
      <SectionTitle eyebrow="Growth Report">Expected Plant Growth</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 22, flex: 1, minHeight: 0 }}>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
          <strong style={{ fontSize: 14, color: C.ink, marginBottom: 14 }}>Visual Height Progression</strong>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 18, padding: '0 8px 8px', minHeight: 0 }}>
            {ms.map((m) => {
              const h = parseFloat(m.range); const px = Number.isFinite(h) ? Math.max(14, (h / maxH) * 300) : 14;
              return (
                <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  <div style={{ fontSize: 11, color: C.muted }}>{m.range}</div>
                  <div style={{ width: '58%', height: px, background: m.current ? C.green : '#bfe3cf', borderRadius: '8px 8px 0 0' }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>{m.label}</div>
                </div>
              );
            })}
            {ms.length === 0 && <EmptyBlock label="No growth data" height={180} />}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11.5, textTransform: 'uppercase', color: C.muted }}>Key Milestones</div>
          {ms.map((m) => (
            <div key={m.label} className={m.current ? 'rpt-dark' : undefined} style={{ border: `1px solid ${m.current ? C.green : C.line}`, background: m.current ? `linear-gradient(135deg,${C.dark},${C.dark2})` : '#fff', color: m.current ? '#fff' : C.ink, borderRadius: 14, padding: '14px 16px', boxShadow: m.current ? 'none' : CARD_SHADOW }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 15, color: m.current ? C.green : C.ink }}>{m.label}</strong><span style={{ fontWeight: 800 }}>{m.range}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: m.current ? 'rgba(255,255,255,.6)' : C.muted }}>
                <span>{m.date}</span>{m.current && computed.current_height_label && <span style={{ background: C.green, color: C.dark, borderRadius: 999, padding: '2px 10px', fontWeight: 700 }}>Current: {computed.current_height_label}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlidePage>
  );
}

/* --------------------- Slide 14: Site Master Plan --------------------- */
export function S14SiteMasterPlan({ data }: SlideProps) {
  const { meta, forest, computed } = data;
  const p = computed.site_master_plan;
  const rows: [string, ReactNode][] = [
    ['Grids : Total', p?.grid_label ?? '—'],
    ['Plants : Per Matrix', p?.per_matrix_label ?? '—'],
    ['Plants : Total', p ? numOrDash(p.total_saplings) : '—'],
    ['Spacing : Between Grids', p?.spacing_grids != null ? `${p.spacing_grids} ft` : '—'],
    ['Spacing : Between Plants', p?.spacing_plants != null ? `${p.spacing_plants} ft` : '—'],
    ['Spacing : Pathway', p?.spacing_pathway != null ? `${p.spacing_pathway} ft` : '—'],
  ];
  return (
    <SlidePage meta={meta}>
      <SectionTitle>Site Master Plan</SectionTitle>
      <div style={{ fontSize: 13, color: C.muted, marginTop: -12, marginBottom: 14 }}>
        Layout for the {dash(forest.forest_city)} site proposing the plantation of {numOrDash(computed.total_saplings)} saplings in a systematic matrix configuration.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'minmax(0, 1fr)', gap: 22, flex: 1, minHeight: 0 }}>
        <ReportImage src={forest.site_layout} label="Site layout plan" style={{ height: '100%' }} />
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <StatCard label="Box Count" value={p ? numOrDash(p.box_count) : '—'} sub="Allocated plots" />
            <StatCard label="Total Saplings" value={p ? numOrDash(p.total_saplings) : '—'} sub="Planted across all plots" valueColor={C.green} />
          </div>
          <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.06em', color: C.muted, marginBottom: 6 }}>Plantation Grid</div>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: '4px 16px' }}>
            {rows.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: `1px solid ${C.line}`, fontSize: 13.5 }}>
                <span style={{ color: C.muted }}>{k}</span><strong style={{ color: C.ink }}>{v}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlidePage>
  );
}
