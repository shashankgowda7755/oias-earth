import {
  SectionShell,
  FieldGrid,
  Txt,
  Img,
  Sel,
  RepeatableRows,
  Num,
  type SectionProps,
} from '../kit';

const SPONSOR_LOGO_TYPE_OPTIONS = [
  { label: 'Initiated By', value: 'initiated_by' },
  { label: 'Sponsored By', value: 'sponsored_by' },
  { label: 'Supported By', value: 'supported_by' },
  { label: 'In Collaboration With', value: 'in_collaboration_with' },
];

const REPORT_SLIDE_TYPE_OPTIONS = [
  { label: 'Cover Slide (Slide 1)', value: 'first_slide' },
  { label: 'Contents Slide (Slide 2)', value: 'content_slide' },
  { label: 'Project Impact Slide (Slide 6)', value: 'project_impact_slide' },
];

const SPECIES_HEALTH_OPTIONS = [
  { label: 'Good', value: 'good' },
  { label: 'Average', value: 'average' },
  { label: 'Poor', value: 'poor' },
  { label: 'Others', value: 'others' },
];

function sponsorLogoLabel(value: string): string {
  const found = SPONSOR_LOGO_TYPE_OPTIONS.find((o) => o.value === value);
  return found ? found.label : value;
}

/** Map a report-slide hero type to its report-image upload slot. */
function heroSlot(slideType?: string): string {
  if (slideType === 'content_slide') return 'content';
  if (slideType === 'project_impact_slide') return 'impact';
  return 'cover';
}

export function MediaSection({ draft, patch }: SectionProps) {
  const forestId = draft.id;
  return (
    <>
      <SectionShell
        title="Species Health"
        desc="Overall health status and outstanding issues for the plantation."
      >
        <FieldGrid cols={2}>
          <Sel
            label="Health"
            value={draft.species_details?.health}
            onChange={(v) =>
              patch({ species_details: { ...draft.species_details, health: v } })
            }
            options={SPECIES_HEALTH_OPTIONS}
          />
          <Txt
            label="Health (Other)"
            value={draft.species_details?.health_other}
            onChange={(v) =>
              patch({ species_details: { ...draft.species_details, health_other: v } })
            }
          />
          <Num
            label="Mortality %"
            value={draft.species_details?.mortality_rate}
            onChange={(v) =>
              patch({ species_details: { ...draft.species_details, mortality_rate: v } })
            }
          />
          <Txt
            label="Other Issues"
            value={draft.species_details?.other_issues}
            onChange={(v) =>
              patch({ species_details: { ...draft.species_details, other_issues: v } })
            }
          />
          <Txt
            label="Additional Scope"
            value={draft.species_details?.additional_scope}
            onChange={(v) =>
              patch({
                species_details: { ...draft.species_details, additional_scope: v },
              })
            }
          />
        </FieldGrid>
      </SectionShell>

      <SectionShell
        title="Environmental Need Indicators"
        desc="Headings and descriptions of environmental indicators for the site."
      >
        <RepeatableRows
          label="Indicators"
          items={draft.environmental_need_indicators}
          onChange={(next) => patch({ environmental_need_indicators: next })}
          blank={() => ({})}
          addLabel="Add indicator"
          rowTitle={(row, i) => row.heading?.trim() || `Indicator ${i + 1}`}
          renderRow={(row, update) => (
            <FieldGrid cols={1}>
              <Txt
                label="Heading"
                value={row.heading}
                onChange={(v) => update({ heading: v })}
              />
              <Txt
                label="Description"
                value={row.description}
                onChange={(v) => update({ description: v })}
                multiline
              />
            </FieldGrid>
          )}
        />
      </SectionShell>

      <SectionShell
        title="Security & Infrastructure"
        desc="Fencing, signage and other site security/infrastructure with photos."
      >
        <FieldGrid cols={1}>
          <Txt
            label="Description"
            value={draft.security_and_infrastructure?.description}
            onChange={(v) =>
              patch({
                security_and_infrastructure: {
                  ...draft.security_and_infrastructure,
                  description: v,
                },
              })
            }
            multiline
          />
        </FieldGrid>
        <RepeatableRows
          label="Images"
          items={draft.security_and_infrastructure?.image_data}
          onChange={(next) =>
            patch({
              security_and_infrastructure: {
                ...draft.security_and_infrastructure,
                image_data: next,
              },
            })
          }
          blank={() => ({})}
          addLabel="Add image"
          rowTitle={(row, i) => row.name?.trim() || `Image ${i + 1}`}
          renderRow={(row, update) => (
            <FieldGrid cols={2}>
              <Txt label="Name" value={row.name} onChange={(v) => update({ name: v })} />
              <Txt
                label="Description"
                value={row.description}
                onChange={(v) => update({ description: v })}
              />
              <Img
                label="Image"
                value={row.image}
                onChange={(v) => update({ image: v })}
                forestId={forestId}
                slot="security"
              />
            </FieldGrid>
          )}
        />
      </SectionShell>

      <SectionShell
        title="Plantation Progress"
        desc="Quarterly progress photos of the plantation."
      >
        <RepeatableRows
          label="Progress images"
          items={draft.plantation_progress}
          onChange={(next) => patch({ plantation_progress: next })}
          blank={() => ({ year: 0, quarter: 1 })}
          addLabel="Add progress image"
          rowTitle={(row, i) =>
            row.year ? `Y${row.year} Q${row.quarter}` : `Progress ${i + 1}`
          }
          renderRow={(row, update) => (
            <FieldGrid cols={3}>
              <Num
                label="Year"
                value={row.year}
                onChange={(v) => update({ year: v ?? 0 })}
              />
              <Num
                label="Quarter"
                value={row.quarter}
                onChange={(v) => update({ quarter: v ?? 1 })}
              />
              <Img
                label="Image"
                value={row.image}
                onChange={(v) => update({ image: v })}
                forestId={forestId}
                slot="progress"
                year={row.year}
                quarter={row.quarter}
              />
            </FieldGrid>
          )}
        />
      </SectionShell>

      <SectionShell
        title="Photo Gallery (Slide 22)"
        desc="Quarterly gallery photos shown on the Photo Gallery slide (Slide 22)."
      >
        <RepeatableRows
          label="Gallery photos"
          items={draft.gallery_images}
          onChange={(next) => patch({ gallery_images: next })}
          blank={() => ({ year: 0, quarter: 1 })}
          addLabel="Add gallery photo"
          rowTitle={(row, i) => row.year ? `Y${row.year} Q${row.quarter}` : `Photo ${i + 1}`}
          renderRow={(row, update) => (
            <FieldGrid cols={2}>
              <Num label="Year" value={row.year} onChange={(v) => update({ year: v ?? 0 })} />
              <Num label="Quarter" value={row.quarter} onChange={(v) => update({ quarter: v ?? 1 })} />
              <Img
                label="Image"
                value={row.image}
                onChange={(v) => update({ image: v })}
                forestId={forestId}
                slot="gallery"
                year={row.year}
                quarter={row.quarter}
              />
              <Txt label="Caption" value={row.caption} onChange={(v) => update({ caption: v })} />
            </FieldGrid>
          )}
        />
      </SectionShell>

      <SectionShell
        title="Additional Sponsor Logos"
        desc="Organisation logos shown on report pages. 'Sponsored By' logo appears top-right on every slide. 'Initiated By' is the COMMUNITREE logo shown bottom-right."
      >
        <RepeatableRows
          label="Sponsor logos"
          items={draft.additional_sponsor_logo}
          onChange={(next) => patch({ additional_sponsor_logo: next })}
          blank={() => ({})}
          addLabel="Add sponsor logo"
          rowTitle={(row, i) => row.name?.trim() || `Logo ${i + 1}`}
          renderRow={(row, update) => (
            <FieldGrid cols={3}>
              <Sel
                label="Type"
                value={row.type?.value}
                onChange={(v) =>
                  update({ type: { value: v, label: sponsorLogoLabel(v) } })
                }
                options={SPONSOR_LOGO_TYPE_OPTIONS}
              />
              <Txt label="Name" value={row.name} onChange={(v) => update({ name: v })} />
              <Img
                label="Logo"
                value={row.logo}
                onChange={(v) => update({ logo: v })}
                forestId={forestId}
                slot="sponsor_logo"
              />
            </FieldGrid>
          )}
        />
      </SectionShell>

      <SectionShell
        title="Report Slide Hero Images"
        desc="Background images for specific report slides. Add one entry per slide type needed."
      >
        <RepeatableRows
          label="Slides"
          items={draft.report_images}
          onChange={(next) => patch({ report_images: next })}
          blank={() => ({})}
          addLabel="Add slide"
          rowTitle={(row, i) => {
            const found = REPORT_SLIDE_TYPE_OPTIONS.find((o) => o.value === row.slide_type);
            return found ? found.label : `Slide ${i + 1}`;
          }}
          renderRow={(row, update) => (
            <FieldGrid cols={2}>
              <Sel
                label="Slide Type"
                value={row.slide_type}
                onChange={(v) => update({ slide_type: v })}
                options={REPORT_SLIDE_TYPE_OPTIONS}
              />
              <Img
                label="Image"
                value={row.image}
                onChange={(v) => update({ image: v })}
                forestId={forestId}
                slot={heroSlot(row.slide_type)}
              />
            </FieldGrid>
          )}
        />
      </SectionShell>

      <SectionShell
        title="Dashboard Images"
        desc="Named images surfaced on the forest dashboard."
      >
        <RepeatableRows
          label="Dashboard images"
          items={draft.dashboard_images}
          onChange={(next) => patch({ dashboard_images: next })}
          blank={() => ({})}
          addLabel="Add dashboard image"
          rowTitle={(row, i) => row.name?.trim() || `Image ${i + 1}`}
          renderRow={(row, update) => (
            <FieldGrid cols={2}>
              <Txt label="Name" value={row.name} onChange={(v) => update({ name: v })} />
              <Txt
                label="Description"
                value={row.description}
                onChange={(v) => update({ description: v })}
              />
              <Img
                label="Image"
                value={row.image}
                onChange={(v) => update({ image: v })}
                forestId={forestId}
                slot="dashboard"
              />
            </FieldGrid>
          )}
        />
      </SectionShell>
    </>
  );
}
