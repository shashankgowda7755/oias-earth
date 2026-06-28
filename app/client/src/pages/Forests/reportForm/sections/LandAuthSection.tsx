import { SectionShell, FieldGrid, Txt, Num, Img, Sel, Dt, type SectionProps } from '../kit';

export function LandAuthSection({ draft, patch }: SectionProps) {
  const forestId = draft.id;
  return (
    <>
      <SectionShell title="Land Ownership & Area">
        <FieldGrid cols={2}>
          <Txt
            label="Owner name"
            value={draft.land_ownership?.name}
            onChange={(v) => patch({ land_ownership: { ...draft.land_ownership, name: v } })}
          />
          <Sel
            label="Agreement status"
            value={draft.land_ownership?.agreement_status}
            onChange={(v) =>
              patch({ land_ownership: { ...draft.land_ownership, agreement_status: v } })
            }
            options={[
              { label: 'Agreement Confirmed', value: 'agreement_confirmed' },
              { label: 'Agreement Pending', value: 'agreement_pending' },
              { label: 'No Agreement', value: 'no_agreement' },
            ]}
          />
          <Num
            label="Total area (ft2)"
            value={draft.land_area?.total_area}
            onChange={(v) => patch({ land_area: { ...draft.land_area, total_area: v } })}
          />
          <Num
            label="Planted area (ft2)"
            value={draft.land_area?.planted_area}
            onChange={(v) => patch({ land_area: { ...draft.land_area, planted_area: v } })}
          />
        </FieldGrid>
      </SectionShell>

      <SectionShell title="Authorization Details">
        <FieldGrid cols={2}>
          <Txt
            label="Authorized by name"
            value={draft.authorization_details?.authorized_by_name}
            onChange={(v) =>
              patch({
                authorization_details: {
                  ...draft.authorization_details,
                  authorized_by_name: v,
                },
              })
            }
          />
          <Txt
            label="Authorized by designation"
            value={draft.authorization_details?.authorized_by_designation}
            onChange={(v) =>
              patch({
                authorization_details: {
                  ...draft.authorization_details,
                  authorized_by_designation: v,
                },
              })
            }
          />
          <Dt
            label="Authorized date"
            value={draft.authorization_details?.authorized_date}
            onChange={(v) =>
              patch({
                authorization_details: {
                  ...draft.authorization_details,
                  authorized_date: v,
                },
              })
            }
          />
          <Txt
            label="Authorized period (years)"
            value={
              draft.authorization_details?.authorized_period != null
                ? String(draft.authorization_details.authorized_period)
                : undefined
            }
            onChange={(v) =>
              patch({
                authorization_details: {
                  ...draft.authorization_details,
                  authorized_period: v,
                },
              })
            }
          />
        </FieldGrid>
        <FieldGrid cols={1}>
          <Txt
            label="Project context"
            multiline
            value={draft.authorization_details?.project_context}
            onChange={(v) =>
              patch({
                authorization_details: {
                  ...draft.authorization_details,
                  project_context: v,
                },
              })
            }
          />
        </FieldGrid>
      </SectionShell>

      <SectionShell title="Documents & Inspection">
        <FieldGrid cols={2}>
          <Img
            label="Permission letter image"
            value={draft.permission_letter}
            onChange={(v) => patch({ permission_letter: v })}
            forestId={forestId}
            slot="permission"
          />
          <Img
            label="Site layout image"
            value={draft.site_layout}
            onChange={(v) => patch({ site_layout: v })}
            forestId={forestId}
            slot="layout"
          />
          <Txt label="Digipin" value={draft.digipin} onChange={(v) => patch({ digipin: v })} />
          <Dt
            label="Last inspection date"
            value={draft.last_inspection_date}
            onChange={(v) => patch({ last_inspection_date: v })}
          />
        </FieldGrid>
      </SectionShell>
    </>
  );
}
