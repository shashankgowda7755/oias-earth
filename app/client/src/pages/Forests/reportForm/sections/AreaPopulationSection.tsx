import { SectionShell, FieldGrid, Txt, Num, Url, RepeatableRows, type SectionProps } from '../kit';

export function AreaPopulationSection({ draft, patch }: SectionProps) {
  const aps = draft.area_population_statistics_details;
  return (
    <SectionShell title="Area & Population Statistics">
      <FieldGrid cols={2}>
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
            <Url label="Image" value={row.image} onChange={(v) => update({ image: v })} />
            <Num label="Year" value={row.year} onChange={(v) => update({ year: v })} />
            <Num label="Population" value={row.population} onChange={(v) => update({ population: v })} />
          </FieldGrid>
        )}
      />
    </SectionShell>
  );
}
