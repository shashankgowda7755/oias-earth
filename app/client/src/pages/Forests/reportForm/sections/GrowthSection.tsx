import { SectionShell, FieldGrid, Num, RepeatableRows, type SectionProps } from '../kit';

export function GrowthSection({ draft, patch }: SectionProps) {
  return (
    <>
      <SectionShell title="Plant Growth">
        <RepeatableRows
          label="Target Height Range"
          items={draft.plant_growth_data?.target_height_range}
          onChange={(next) => patch({ plant_growth_data: { ...draft.plant_growth_data, target_height_range: next } })}
          blank={() => ({ year: 0 })}
          addLabel="Add target range"
          rowTitle={(row) => 'Year ' + (row.year ?? 0)}
          renderRow={(row, update) => (
            <FieldGrid cols={3}>
              <Num label="Year (0-3)" value={row.year} onChange={(v) => update({ year: v ?? 0 })} />
              <Num label="Min" value={row.min} onChange={(v) => update({ min: v })} />
              <Num label="Max" value={row.max} onChange={(v) => update({ max: v })} />
            </FieldGrid>
          )}
        />
        <RepeatableRows
          label="Actual Height Range"
          items={draft.plant_growth_data?.actual_height_range}
          onChange={(next) => patch({ plant_growth_data: { ...draft.plant_growth_data, actual_height_range: next } })}
          blank={() => ({ year: 0, quarter: 1 })}
          addLabel="Add actual range"
          rowTitle={(row) => (row.year ?? 0) + ' Q' + (row.quarter ?? 0)}
          renderRow={(row, update) => (
            <FieldGrid cols={4}>
              <Num label="Year" value={row.year} onChange={(v) => update({ year: v ?? 0 })} />
              <Num label="Quarter" value={row.quarter} onChange={(v) => update({ quarter: v ?? 0 })} />
              <Num label="Min" value={row.min} onChange={(v) => update({ min: v })} />
              <Num label="Max" value={row.max} onChange={(v) => update({ max: v })} />
            </FieldGrid>
          )}
        />
      </SectionShell>
    </>
  );
}
