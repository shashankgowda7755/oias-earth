import { useState } from 'react';
import { fetchCityStats } from '../../forestApi';
import { SectionShell, FieldGrid, Txt, Num, Img, RepeatableRows, type SectionProps } from '../kit';

export function AreaPopulationSection({ draft, patch }: SectionProps) {
  const aps = draft.area_population_statistics_details;
  const forestId = draft.id;
  const [filling, setFilling] = useState(false);
  const [fillMsg, setFillMsg] = useState<string | null>(null);

  const autoFill = async () => {
    const city = draft.forest_city?.trim();
    if (!city) {
      setFillMsg('No city set on this forest. Add it in the forest settings first.');
      return;
    }
    setFilling(true);
    setFillMsg(null);
    try {
      const data = await fetchCityStats(
        city,
        draft.forest_state ?? undefined,
        draft.forest_country ?? undefined,
      );
      if (data.error) {
        setFillMsg(`Wikipedia: ${data.error}`);
        return;
      }
      patch({
        area_population_statistics_details: {
          ...draft.area_population_statistics_details,
          region_name: data.region_name ?? aps?.region_name,
          total_jurisdiction_area: data.total_jurisdiction_area ?? aps?.total_jurisdiction_area,
          population: data.population ?? aps?.population,
          population_density: data.population_density ?? aps?.population_density,
        },
      });
      setFillMsg(`Filled from Wikipedia (${data.region_name}). Review values — population may reflect the full metro, not just the local zone.`);
    } catch {
      setFillMsg('Wikipedia fetch failed — fill manually.');
    } finally {
      setFilling(false);
    }
  };

  return (
    <SectionShell title="Area & Population Statistics">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          onClick={autoFill}
          disabled={filling}
          style={{
            fontSize: 12,
            padding: '5px 12px',
            borderRadius: 6,
            cursor: filling ? 'default' : 'pointer',
            border: '1px solid #4caf50',
            background: filling ? 'transparent' : 'rgba(76,175,80,0.08)',
            color: '#4caf50',
            opacity: filling ? 0.6 : 1,
          }}
        >
          {filling ? '⏳ Fetching…' : '⚡ Auto-fill from city name'}
        </button>
        {fillMsg && (
          <span style={{ fontSize: 12, color: fillMsg.startsWith('Filled') ? '#aaa' : '#f87171' }}>
            {fillMsg}
          </span>
        )}
      </div>
      <FieldGrid cols={2}>
        <Txt
          label="Region / Sub-area Name"
          value={aps?.region_name}
          onChange={(v) =>
            patch({ area_population_statistics_details: { ...draft.area_population_statistics_details, region_name: v } })
          }
        />
        <Num
          label="Total Jurisdiction Area"
          value={aps?.total_jurisdiction_area}
          onChange={(v) =>
            patch({ area_population_statistics_details: { ...draft.area_population_statistics_details, total_jurisdiction_area: v } })
          }
        />
        <Num
          label="Population"
          value={aps?.population}
          onChange={(v) =>
            patch({ area_population_statistics_details: { ...draft.area_population_statistics_details, population: v } })
          }
        />
        <Num
          label="Population Density"
          value={aps?.population_density}
          onChange={(v) =>
            patch({ area_population_statistics_details: { ...draft.area_population_statistics_details, population_density: v } })
          }
        />
        <Txt
          label="Green Cover"
          value={aps?.green_cover}
          onChange={(v) =>
            patch({ area_population_statistics_details: { ...draft.area_population_statistics_details, green_cover: v } })
          }
        />
        <Txt
          label="Environmental Need"
          value={aps?.environmental_need}
          onChange={(v) =>
            patch({ area_population_statistics_details: { ...draft.area_population_statistics_details, environmental_need: v } })
          }
        />
      </FieldGrid>
      <RepeatableRows
        label="Google Earth Images"
        items={aps?.google_earth_image}
        onChange={(next) =>
          patch({ area_population_statistics_details: { ...draft.area_population_statistics_details, google_earth_image: next } })
        }
        blank={() => ({})}
        addLabel="Add image"
        rowTitle={(row, i) => `Image ${i + 1}${row.year != null ? ` — ${row.year}` : ''}`}
        renderRow={(row, update) => (
          <FieldGrid cols={2}>
            <Img
              label="Image"
              value={row.image}
              onChange={(v) => update({ image: v })}
              forestId={forestId}
              slot="earth"
            />
            <Num label="Year" value={row.year} onChange={(v) => update({ year: v })} />
            <Num label="Population" value={row.population} onChange={(v) => update({ population: v })} />
          </FieldGrid>
        )}
      />
    </SectionShell>
  );
}
