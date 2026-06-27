/**
 * Slides 15–22: Soil pH, Temperature, Environmental Indicators, Species
 * Inventory, Score Card (GRI), Site Security, Plantation Progress, Thank You.
 */
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { SlideProps } from '../reportTypes';
import {
  C, SectionTitle, SlidePage, ReportImage, EmptyBlock, DarkPanel, Pill, CARD_SHADOW,
  dash, numOrDash, fmtDate, enumLabel,
} from '../reportPrimitives';

const pickQuarter = <T extends { year: number; quarter: number }>(arr: T[] | undefined, year: number, q: number): T | undefined =>
  (arr ?? []).find((e) => e.year === year && e.quarter === q) ?? (arr ?? []).slice().sort((a, b) => b.year - a.year || b.quarter - a.quarter)[0];

/* A reading of 0 (pH / °C / %RH) means "not measured", not a real value — a
 * plantation is never 0°C / 0%RH and pH 0 is impossible. Treat ≤0 + non-finite
 * as unset so the report shows "—" instead of a misleading zero. */
const pos = (v?: number | null): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;

/* --------------------- Slide 15: Soil pH Level --------------------- */
const PH_COLORS = ['#e2231a', '#ee5a24', '#f39c12', '#f7c948', '#d4e157', '#a4d65e', '#7cb342', '#4caf50', '#26a69a', '#29b6d8', '#2196f3', '#5c6bc0', '#7e57c2', '#9c27b0', '#ab47bc'];
export function S15SoilPh({ data }: SlideProps) {
  const { meta, forest } = data;
  const ph = pickQuarter(forest.soil_ph_level, meta.year, meta.quarter);
  const phReading = pos(ph?.meter_reading);
  const beforeReading = pos(ph?.before_reading);
  const phIdx = phReading != null ? Math.max(0, Math.min(14, Math.round(phReading))) : null;
  const cards = [
    ['Acidic Land', 'Acidic soils often increase availability of toxic metals like aluminium & manganese, which can damage roots.', C.red],
    ['Neutral Land', 'pH ~6.5 to 7.5: saplings generally show better growth, survival, and resistance to diseases.', C.green],
    ['Alkaline Land', 'pH > 7.5: some species adapted to alkaline soils may thrive, but sensitive saplings may require amendment.', C.amber],
  ] as const;
  return (
    <SlidePage meta={meta}>
      <SectionTitle>Description: Soil pH Level</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22, flex: 1, minHeight: 0 }}>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px', background: '#fff', boxShadow: CARD_SHADOW }}>
          <strong style={{ fontSize: 14, color: C.ink }}>📋 pH Improvement Trajectory</strong>
          <div style={{ display: 'flex', gap: 2, marginTop: 18 }}>
            {PH_COLORS.map((_, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: C.ink, height: 16 }}>{phIdx === i ? '▼' : ''}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
            {PH_COLORS.map((c, i) => (
              <div key={i} style={{ flex: 1, height: 34, background: c, borderRadius: 4, color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, outline: phIdx === i ? `2px solid ${C.ink}` : 'none' }}>{i}</div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 16 }}>
            <span>Before Plantation{beforeReading != null ? `: ${beforeReading} pH` : ''}</span><span>After Plantation{phReading != null ? `: ${phReading} pH` : ''}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {cards.map(([t, d, col]) => (
              <div key={t} style={{ border: `1px solid ${col}33`, background: `${col}0f`, borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: col }}>{t}</div>
                <div style={{ fontSize: 11, color: C.body, marginTop: 4, lineHeight: 1.4 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', background: '#fff', boxShadow: CARD_SHADOW }}>
          <strong style={{ fontSize: 14, color: C.ink }}>On-Site Verification</strong>
          <div style={{ fontSize: 12, color: C.muted, margin: '6px 0 12px' }}>Real-time measurement taken inside the plantation area.</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.muted, marginBottom: 8 }}>
            <span>Device: Digital Soil Tester</span><span>{fmtDate(ph?.reading_date)}</span>
          </div>
          <ReportImage src={ph?.meter_image} label="Meter photo" style={{ flex: 1, minHeight: 120 }} />
          <div style={{ background: C.greenSoft, borderRadius: 10, padding: '10px 14px', marginTop: 12 }}>
            <div style={{ fontSize: 11, color: C.greenDark }}>● Active Measurement</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>Current Reading: {phReading != null ? `${phReading} pH` : '—'}</div>
          </div>
        </div>
      </div>
    </SlidePage>
  );
}

/* --------------------- Slide 16: Temperature --------------------- */
export function S16Temperature({ data }: SlideProps) {
  const { meta, forest } = data;
  const th = pickQuarter(forest.temperature_humidity, meta.year, meta.quarter);
  const inside = th?.inside_plantation, outside = th?.outside_plantation;
  const inT = pos(inside?.temperature), outT = pos(outside?.temperature);
  const inH = pos(inside?.humidity), outH = pos(outside?.humidity);
  const tempDiff = inT != null && outT != null ? Math.abs(outT - inT) : null;
  const humDiff = inH != null && outH != null ? Math.abs(outH - inH) : null;
  const panel = (title: string, p?: { temperature?: number; humidity?: number; image?: string }) => (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px', background: '#fff', boxShadow: CARD_SHADOW }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.05em', color: C.muted, marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'center' }}>
        <div>
          <div style={{ width: 90, height: 90, borderRadius: '50%', border: `4px solid ${C.greenSoft}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: C.ink }}>{pos(p?.temperature) != null ? `${pos(p?.temperature)}°c` : '—'}</span>
            <span style={{ fontSize: 9.5, color: C.muted }}>TEMPERATURE</span>
          </div>
          <div style={{ marginTop: 10 }}><span style={{ fontSize: 18, fontWeight: 800, color: C.amber }}>{pos(p?.humidity) != null ? `${pos(p?.humidity)} RH` : '—'}</span><div style={{ fontSize: 9.5, color: C.muted }}>HUMIDITY</div></div>
        </div>
        <ReportImage src={p?.image} label="Photo" height={120} />
      </div>
    </div>
  );
  return (
    <SlidePage meta={meta}>
      <SectionTitle>Description: Temperature</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {panel('Inside Plantation', inside)}
        {panel('Outside Plantation', outside)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 1.4fr', gap: 18, marginTop: 18, flex: 1, alignItems: 'start' }}>
        <DarkPanel radius={14} style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'rgba(255,255,255,.6)' }}>The Difference</div>
          <div style={{ display: 'flex', gap: 22, marginTop: 12 }}>
            <div><div style={{ fontSize: 24, fontWeight: 800 }}>{tempDiff != null ? `${tempDiff.toFixed(1)}°c` : '—'}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)' }}>TEMP</div></div>
            <div><div style={{ fontSize: 24, fontWeight: 800 }}>{humDiff != null ? `${humDiff.toFixed(1)} RH` : '—'}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)' }}>HUMID</div></div>
          </div>
        </DarkPanel>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em', color: C.green, fontWeight: 700, marginBottom: 6 }}>💡 Scientific Insight</div>
          <div style={{ fontSize: 14, color: C.body, lineHeight: 1.6 }}>
            An increase in humidity can support better plant growth, aiding transpiration and nutrient uptake. The plantation micro-climate lowers temperature while maintaining vital moisture.
          </div>
        </div>
      </div>
    </SlidePage>
  );
}

/* --------------------- Slide 17: Environmental Need Indicators --------------------- */
export function S17EnvIndicators({ data }: SlideProps) {
  const { meta, forest } = data;
  const items = forest.environmental_need_indicators ?? [];
  const area = forest.area_population_statistics_details?.region_name?.trim() || dash(forest.forest_city);
  return (
    <SlidePage meta={meta}>
      <SectionTitle>Environmental Need Indicators of {area}</SectionTitle>
      {items.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
          {items.map((it, i) => (
            <div key={i} style={{ border: `1px solid ${C.line}`, borderLeft: `4px solid ${[C.green, C.blue, C.orange, C.purple][i % 4]}`, borderRadius: 14, padding: '16px 18px', background: '#fff', boxShadow: CARD_SHADOW }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>{dash(it.heading)}</div>
              <div style={{ fontSize: 13.5, color: C.body, marginTop: 6, lineHeight: 1.5 }}>{dash(it.description)}</div>
            </div>
          ))}
        </div>
      ) : <EmptyBlock label="No environmental indicators entered" height={200} />}
    </SlidePage>
  );
}

/* --------------------- Slide 18: Species Inventory --------------------- */
const TRAIT_ICONS: [keyof SpeciesTraits, string, string][] = [
  ['timber', 'Timber', '#a1764b'], ['pollination', 'Pollination', '#e8a020'], ['nesting', 'Nesting', '#7d5a3a'], ['fruit', 'Fruit', '#e2574c'],
];
type SpeciesTraits = { timber: boolean; pollination: boolean; nesting: boolean; fruit: boolean };
export function S18Species({ data }: SlideProps) {
  const { meta, forest, computed } = data;
  const sd = forest.species_details;
  const inv = computed.species_inventory;
  const total = computed.total_saplings || 1;
  // Donut: cumulative arcs of species share.
  let acc = 0;
  const palette = [C.green, C.blue, C.amber, '#9b7fd4', C.red, '#26a69a', '#7cb342', '#5c6bc0', '#ec407a'];
  const segs = inv.map((s, i) => { const start = acc; acc += (s.saplings / total) * 360; return { from: start, to: acc, color: palette[i % palette.length] }; });
  const saplingType = forest.plantation_strategy === 'mixed_species'
    ? 'Mixed'
    : forest.plantation_strategy === 'others'
      ? enumLabel(forest.plantation_strategy_other)
      : enumLabel(forest.plantation_strategy);
  const showTraits = inv.some((s) => Object.values(s.traits).some(Boolean));
  const facts: [string, string][] = [
    ['Saplings Planted', numOrDash(computed.total_saplings)], ['Saplings Health', enumLabel(sd?.health === 'others' ? sd.health_other : sd?.health)],
    ['Saplings Type', saplingType], ['Sapling Mortality', sd?.mortality_rate != null ? `${sd.mortality_rate}%` : '—'],
    ['Saplings Spacing', forest.tree_to_tree_distance != null ? `${forest.tree_to_tree_distance} ft` : '—'], ['Other Issues', dash(sd?.other_issues)],
    ['Sapling Species', numOrDash(computed.species_count)], ['Additional Plantation Scope', dash(sd?.additional_scope)],
  ];
  return (
    <SlidePage meta={meta}>
      <SectionTitle>Saplings Planted &amp; Species Inventory</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, marginBottom: 16 }}>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px', background: '#fff', boxShadow: CARD_SHADOW }}>
          <strong style={{ fontSize: 14, color: C.ink }}>Saplings Management (Plantation Data)</strong>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginTop: 12 }}>
            {facts.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: `1px solid ${C.line}`, paddingBottom: 6 }}>
                <span style={{ color: C.muted }}>{k}</span><strong style={{ color: C.ink }}>{v}</strong>
              </div>
            ))}
          </div>
        </div>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', boxShadow: CARD_SHADOW }}>
          <svg width="150" height="150" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={C.line} strokeWidth="3.4" />
            {segs.map((s, i) => {
              const r = 15.9, cx = 18, cy = 18; const a0 = (s.from - 90) * Math.PI / 180, a1 = (s.to - 90) * Math.PI / 180;
              const large = s.to - s.from > 180 ? 1 : 0;
              const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
              return <path key={i} d={`M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`} fill="none" stroke={s.color} strokeWidth="3.4" />;
            })}
            <text x="18" y="17" textAnchor="middle" fontSize="6" fontWeight="700" fill={C.ink}>{numOrDash(computed.total_saplings)}</text>
            <text x="18" y="22" textAnchor="middle" fontSize="2.6" fill={C.muted}>Saplings</text>
          </svg>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em', color: C.muted }}>Detailed Species Inventory</span>
        {inv.length > 5 && <span style={{ fontSize: 11.5, color: C.green, fontWeight: 600 }}>+{inv.length - 5} more species</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {inv.slice(0, 5).map((s) => (
          <div key={s.common_name} style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column', background: '#fff', boxShadow: CARD_SHADOW }}>
            <strong style={{ fontSize: 14, color: C.ink }}>{s.common_name}</strong>
            {s.description && <div style={{ fontSize: 11, color: C.muted, margin: '6px 0', flex: 1, overflow: 'hidden', lineHeight: 1.4 }}>{s.description}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.line}`, paddingTop: 8, marginTop: 'auto' }}>
              <span style={{ fontSize: 11, color: C.muted }}>Saplings</span><strong style={{ color: C.green }}>{numOrDash(s.saplings)}</strong>
            </div>
            {showTraits && (
              <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                {TRAIT_ICONS.map(([key, label, col]) => (
                  <span key={key} title={label} style={{ width: 16, height: 16, borderRadius: 4, background: s.traits[key] ? col : C.line, opacity: s.traits[key] ? 1 : 0.35 }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </SlidePage>
  );
}

/* --------------------- Slide 19: Score Card (GRI) --------------------- */
export function S19ScoreCard({ data }: SlideProps) {
  const { meta, forest } = data;
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/report/forest/${forest.id ?? 'preview'}`;
    QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#0f7d57', light: '#ffffff' } }).then(setQr).catch(() => setQr(null));
  }, [forest.id]);
  return (
    <SlidePage meta={meta}>
      <SectionTitle>Score Card With GRI Framework Integration</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 1.3fr', gap: 22, flex: 1, alignItems: 'start' }}>
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: 22, textAlign: 'center' }}>
          {qr ? <img src={qr} alt="Score card QR" style={{ width: 200, height: 200 }} /> : <EmptyBlock label="QR" height={200} />}
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginTop: 12 }}>Urban Score Card can be viewed at QR code</div>
        </div>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', border: `1px solid ${C.line}`, boxShadow: CARD_SHADOW, borderRadius: 16, padding: '22px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: C.muted }}>SDG Score Total</div><div style={{ fontSize: 40, fontWeight: 800, color: C.ink }}>—/100</div>
            </div>
            <div style={{ background: '#fff', border: `1px solid ${C.line}`, boxShadow: CARD_SHADOW, borderRadius: 16, padding: '22px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: C.muted }}>GRI framework Total</div><div style={{ fontSize: 40, fontWeight: 800, color: C.ink }}>—/100</div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: C.body, lineHeight: 1.7, marginTop: 18 }}>
            The integration of the GRI framework alongside the SDGs provides a comprehensive evaluation of sustainability efforts across economic, environmental, social, and governance dimensions — reinforcing transparency and accountability for the urban forest initiative.
          </div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 10 }}>Scores populate from the score-card source (added in a later phase).</div>
        </div>
      </div>
    </SlidePage>
  );
}

/* --------------------- Slide 20: Site Security & Infrastructure --------------------- */
export function S20Security({ data }: SlideProps) {
  const { meta, forest } = data;
  const si = forest.security_and_infrastructure;
  return (
    <SlidePage meta={meta}>
      <SectionTitle>Site Security &amp; Infrastructure</SectionTitle>
      {si?.description && <div style={{ fontSize: 14, color: C.body, marginTop: -12, marginBottom: 16, lineHeight: 1.5 }}>{si.description}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, Math.max(2, si?.image_data?.length ?? 0))},1fr)`, gap: 16, flex: 1, minHeight: 0 }}>
        {(si?.image_data?.length ? si.image_data : [{}, {}]).map((im, i) => (
          <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ReportImage src={im.image} label="Site photo" radius={0} style={{ flex: 1, minHeight: 140 }} />
            <div style={{ padding: '12px 14px' }}><strong style={{ fontSize: 14, color: C.ink }}>{dash(im.name)}</strong><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{dash(im.description)}</div></div>
          </div>
        ))}
      </div>
    </SlidePage>
  );
}

/* --------------------- Slide 22: Photo Gallery (one per quarter) --------------------- */
export function S21bGallery({ data }: SlideProps) {
  const { meta, forest } = data;
  const all = (forest.gallery_images ?? []).filter((g) => g && g.image);
  const sorted = [...all].sort((a, b) => (Number(a.year) - Number(b.year)) || (Number(a.quarter) - Number(b.quarter)));
  // Empty-safe: show 4 placeholders when there are no gallery photos yet.
  const cells = sorted.length ? sorted : [{}, {}, {}, {}];
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(cells.length))));
  return (
    <SlidePage meta={meta}>
      <SectionTitle eyebrow="One photo per quarter">Photo Gallery</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, flex: 1, minHeight: 0 }}>
        {cells.map((g, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <ReportImage src={g.image} label={g.year && g.quarter ? `Q${g.quarter} ${g.year}` : 'Gallery photo'} style={{ flex: 1, minHeight: 0 }} />
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6, textAlign: 'center' }}>
              {g.year && g.quarter ? `Q${g.quarter} ${g.year}` : '—'}{g.caption ? ` · ${g.caption}` : ''}
            </div>
          </div>
        ))}
      </div>
    </SlidePage>
  );
}

/* --------------------- Slide 21: Plantation Progress --------------------- */
export function S21Progress({ data }: SlideProps) {
  const { meta, forest } = data;
  const pp = pickQuarter(forest.plantation_progress, meta.year, meta.quarter);
  return (
    <SlidePage meta={meta}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionTitle>Transforming Landscapes: Plantation Progress - {meta.year}</SectionTitle>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: -8, marginBottom: 12 }}>
        <Pill style={{ padding: '8px 16px', fontSize: 13 }}>Year {meta.year}</Pill>
        <Pill style={{ padding: '8px 16px', fontSize: 13 }}>Quarter {meta.quarter} {meta.year}</Pill>
      </div>
      <ReportImage src={pp?.image} label={`Plantation progress · ${meta.quarter_label} ${meta.year}`} style={{ flex: 1, minHeight: 0 }} />
    </SlidePage>
  );
}

/* --------------------- Slide 22: Thank You --------------------- */
export function S22Thanks({ data }: SlideProps) {
  const { meta, forest } = data;
  const initiated = (forest.additional_sponsor_logo ?? []).find((l) => l.type?.value === 'initiated_by');
  const sponsors = (forest.additional_sponsor_logo ?? []).filter((l) => l.type?.value !== 'initiated_by');
  const cards: { caption: string; name?: string; logo?: string }[] = [
    { caption: initiated?.type?.label || 'Initiated by', name: initiated?.name, logo: initiated?.logo },
    ...(sponsors.length
      ? sponsors.map((s) => ({ caption: s.type?.label || 'Sponsored by', name: s.name, logo: s.logo }))
      : [{ caption: 'Sponsored by', name: meta.client_name ?? undefined, logo: meta.client_logo ?? undefined }]),
  ];
  const logoCard = (caption: string, name?: string, logo?: string) => (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '18px 28px', textAlign: 'center', minWidth: 200 }}>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>{caption}</div>
      {logo ? <img src={logo} alt="" style={{ height: 44, objectFit: 'contain' }} /> : <div style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>{dash(name)}</div>}
    </div>
  );
  return (
    <SlidePage meta={meta} bare>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <span style={{ flex: 1 }} />
        <span style={{ color: C.muted, fontSize: 14 }}>Report Dated : {meta.report_date}</span>
      </div>
      <DarkPanel style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#0f3d2e"><path d="M12 21s-7-4.6-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.3 4 2.5.8-1.2 2-2.5 4-2.5 3.5 0 5 3.5 3.5 6.5C19 16.4 12 21 12 21z" /></svg>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 700, margin: 0, color: '#fff' }}>Thank You!</h1>
      </DarkPanel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: cards.length > 2 ? 'center' : 'space-between', marginTop: 24 }}>
        {cards.map((c, i) => <div key={i}>{logoCard(c.caption, c.name, c.logo)}</div>)}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 22 }}>
        <Pill>{meta.quarter_label} Report</Pill>
        <Pill>{meta.period_label}</Pill>
      </div>
      <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: 18, borderTop: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Created By {dash(meta.created_by_name)}</div>
        <div style={{ fontSize: 14, color: C.muted }}>{dash(meta.created_by_phone)}</div>
      </div>
    </SlidePage>
  );
}
