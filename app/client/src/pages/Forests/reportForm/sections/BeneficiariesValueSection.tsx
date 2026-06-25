import { SectionShell, FieldGrid, Num, Txt, type SectionProps } from '../kit';

export function BeneficiariesValueSection({ draft, patch }: SectionProps) {
  const ben = draft.direct_and_indirect_beneficiaries;
  const flow = draft.forest_value_flow_impact_report;
  const num = (v: number | string | undefined): number | undefined => {
    if (v === undefined || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  return (
    <>
      <SectionShell
        title="Direct & Indirect Beneficiaries"
        desc="Headcount of people maintaining, visiting, or living near the forest."
      >
        <FieldGrid cols={3}>
          <Num
            label="Site Supervisor"
            value={num(ben?.site_supervisor)}
            onChange={(v) =>
              patch({ direct_and_indirect_beneficiaries: { ...ben, site_supervisor: v } })
            }
          />
          <Num
            label="Watering Team"
            value={num(ben?.watering_team)}
            onChange={(v) =>
              patch({ direct_and_indirect_beneficiaries: { ...ben, watering_team: v } })
            }
          />
          <Num
            label="De-weeding Crew"
            value={num(ben?.de_weeding_crew)}
            onChange={(v) =>
              patch({ direct_and_indirect_beneficiaries: { ...ben, de_weeding_crew: v } })
            }
          />
          <Num
            label="Plant Health Specialist"
            value={num(ben?.plant_health_specialist)}
            onChange={(v) =>
              patch({
                direct_and_indirect_beneficiaries: { ...ben, plant_health_specialist: v },
              })
            }
          />
          <Txt
            label="People Visiting"
            value={(ben?.people_visiting as string) ?? ''}
            onChange={(v) =>
              patch({ direct_and_indirect_beneficiaries: { ...ben, people_visiting: v } })
            }
          />
          <Txt
            label="People Living Near"
            value={(ben?.people_living_near as string) ?? ''}
            onChange={(v) =>
              patch({ direct_and_indirect_beneficiaries: { ...ben, people_living_near: v } })
            }
          />
          <Txt
            label="Schools & Colleges"
            value={(ben?.schools_colleges as string) ?? ''}
            onChange={(v) =>
              patch({ direct_and_indirect_beneficiaries: { ...ben, schools_colleges: v } })
            }
          />
        </FieldGrid>
      </SectionShell>

      <SectionShell
        title="Forest Value Flow & Impact Report"
        desc="Projected land/tree value, oxygen, and carbon across time horizons."
      >
        <FieldGrid cols={4}>
          <Num
            label="Short Term — Land Value (Cr)"
            value={flow?.short_term?.land_value}
            onChange={(v) =>
              patch({
                forest_value_flow_impact_report: {
                  ...flow,
                  short_term: { ...flow?.short_term, land_value: v },
                },
              })
            }
          />
          <Num
            label="Short Term — Tree Value (Cr)"
            value={flow?.short_term?.tree_value}
            onChange={(v) =>
              patch({
                forest_value_flow_impact_report: {
                  ...flow,
                  short_term: { ...flow?.short_term, tree_value: v },
                },
              })
            }
          />
          <Num
            label="Short Term — Oxygen Generated (Cr)"
            value={flow?.short_term?.oxygen_generated}
            onChange={(v) =>
              patch({
                forest_value_flow_impact_report: {
                  ...flow,
                  short_term: { ...flow?.short_term, oxygen_generated: v },
                },
              })
            }
          />
          <Num
            label="Short Term — Carbon Sequestration (Cr)"
            value={flow?.short_term?.carbon_sequestration}
            onChange={(v) =>
              patch({
                forest_value_flow_impact_report: {
                  ...flow,
                  short_term: { ...flow?.short_term, carbon_sequestration: v },
                },
              })
            }
          />

          <Num
            label="Medium Term — Land Value (Cr)"
            value={flow?.medium_term?.land_value}
            onChange={(v) =>
              patch({
                forest_value_flow_impact_report: {
                  ...flow,
                  medium_term: { ...flow?.medium_term, land_value: v },
                },
              })
            }
          />
          <Num
            label="Medium Term — Tree Value (Cr)"
            value={flow?.medium_term?.tree_value}
            onChange={(v) =>
              patch({
                forest_value_flow_impact_report: {
                  ...flow,
                  medium_term: { ...flow?.medium_term, tree_value: v },
                },
              })
            }
          />
          <Num
            label="Medium Term — Oxygen Generated (Cr)"
            value={flow?.medium_term?.oxygen_generated}
            onChange={(v) =>
              patch({
                forest_value_flow_impact_report: {
                  ...flow,
                  medium_term: { ...flow?.medium_term, oxygen_generated: v },
                },
              })
            }
          />
          <Num
            label="Medium Term — Carbon Sequestration (Cr)"
            value={flow?.medium_term?.carbon_sequestration}
            onChange={(v) =>
              patch({
                forest_value_flow_impact_report: {
                  ...flow,
                  medium_term: { ...flow?.medium_term, carbon_sequestration: v },
                },
              })
            }
          />

          <Num
            label="Long Term — Land Value (Cr)"
            value={flow?.long_term?.land_value}
            onChange={(v) =>
              patch({
                forest_value_flow_impact_report: {
                  ...flow,
                  long_term: { ...flow?.long_term, land_value: v },
                },
              })
            }
          />
          <Num
            label="Long Term — Tree Value (Cr)"
            value={flow?.long_term?.tree_value}
            onChange={(v) =>
              patch({
                forest_value_flow_impact_report: {
                  ...flow,
                  long_term: { ...flow?.long_term, tree_value: v },
                },
              })
            }
          />
          <Num
            label="Long Term — Oxygen Generated (Cr)"
            value={flow?.long_term?.oxygen_generated}
            onChange={(v) =>
              patch({
                forest_value_flow_impact_report: {
                  ...flow,
                  long_term: { ...flow?.long_term, oxygen_generated: v },
                },
              })
            }
          />
          <Num
            label="Long Term — Carbon Sequestration (Cr)"
            value={flow?.long_term?.carbon_sequestration}
            onChange={(v) =>
              patch({
                forest_value_flow_impact_report: {
                  ...flow,
                  long_term: { ...flow?.long_term, carbon_sequestration: v },
                },
              })
            }
          />
        </FieldGrid>
      </SectionShell>
    </>
  );
}
