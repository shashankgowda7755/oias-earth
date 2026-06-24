import { SectionShell, FieldGrid, Txt, Num, Sel, Dt, type SectionProps } from '../kit';

export function SiteConfigSection({ draft, patch }: SectionProps) {
  return (
    <>
      <SectionShell title="Site Configuration">
        <FieldGrid cols={1}>
          <Txt
            label="Forest description"
            value={draft.forest_desc}
            onChange={(v) => patch({ forest_desc: v })}
            multiline
          />
        </FieldGrid>
        <FieldGrid cols={2}>
          <Txt
            label="Forest address"
            value={draft.forest_address}
            onChange={(v) => patch({ forest_address: v })}
          />
          <Txt
            label="Project site"
            value={draft.project_site}
            onChange={(v) => patch({ project_site: v })}
          />
          <Num
            label="Project period (years)"
            value={draft.project_period}
            onChange={(v) => patch({ project_period: v })}
          />
          <Dt
            label="Plantation date"
            value={draft.plantation_date}
            onChange={(v) => patch({ plantation_date: v })}
          />
        </FieldGrid>
        <FieldGrid cols={2}>
          <Sel
            label="Plantation strategy"
            value={draft.plantation_strategy}
            onChange={(v) => patch({ plantation_strategy: v })}
            options={[
              { label: 'Mixed Species', value: 'mixed_species' },
              { label: 'Intense Plantation', value: 'intense_plantation' },
              { label: 'Others', value: 'others' },
            ]}
          />
          <Txt
            label="Plantation strategy (other)"
            value={draft.plantation_strategy_other}
            onChange={(v) => patch({ plantation_strategy_other: v })}
          />
          <Sel
            label="Irrigation method"
            value={draft.irrigation_method}
            onChange={(v) => patch({ irrigation_method: v })}
            options={[
              { label: 'Borewell', value: 'borewell' },
              { label: 'Drip', value: 'drip' },
              { label: 'Sprinkler', value: 'sprinkler' },
              { label: 'Others', value: 'others' },
            ]}
          />
          <Txt
            label="Irrigation method (other)"
            value={draft.irrigation_method_other}
            onChange={(v) => patch({ irrigation_method_other: v })}
          />
          <Sel
            label="Climate"
            value={draft.climate}
            onChange={(v) => patch({ climate: v })}
            options={[
              { label: 'Summer', value: 'summer' },
              { label: 'Winter', value: 'winter' },
              { label: 'Monsoon', value: 'monsoon' },
              { label: 'Others', value: 'others' },
            ]}
          />
          <Txt
            label="Climate (other)"
            value={draft.climate_other}
            onChange={(v) => patch({ climate_other: v })}
          />
          <Sel
            label="Soil type"
            value={draft.soil_type}
            onChange={(v) => patch({ soil_type: v })}
            options={[
              { label: 'Red Soil', value: 'red_soil' },
              { label: 'Black Soil', value: 'black_soil' },
              { label: 'Sandy Soil', value: 'sandy_soil' },
              { label: 'Others', value: 'others' },
            ]}
          />
          <Txt
            label="Soil type (other)"
            value={draft.soil_type_other}
            onChange={(v) => patch({ soil_type_other: v })}
          />
        </FieldGrid>
      </SectionShell>
    </>
  );
}
