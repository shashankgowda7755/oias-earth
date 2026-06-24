import { SectionShell, FieldGrid, Num, RepeatableRows, type SectionProps } from '../kit';

export function MaintenanceSection({ draft, patch }: SectionProps) {
  return (
    <>
      <SectionShell title="Maintenance Workforce (per quarter)">
        <RepeatableRows
          label="Maintenance Workforce"
          items={draft.maintenance_workforce}
          onChange={(next) => patch({ maintenance_workforce: next })}
          blank={() => ({ year: 0, quarter: 1 })}
          addLabel="Add quarter"
          rowTitle={(row) => `${row.year ?? 0} Q${row.quarter ?? 0}`}
          renderRow={(row, update) => (
            <FieldGrid cols={3}>
              <Num
                label="Year"
                value={row.year}
                onChange={(v) => update({ year: v ?? 0 })}
              />
              <Num
                label="Quarter (1-4)"
                value={row.quarter}
                onChange={(v) => update({ quarter: v ?? 0 })}
              />
              <Num
                label="Total Holidays (Weekly Off)"
                value={row.total_holidays_weekly_off}
                onChange={(v) => update({ total_holidays_weekly_off: v })}
              />
              <Num
                label="Total Holidays (Festival)"
                value={row.total_holidays_festival}
                onChange={(v) => update({ total_holidays_festival: v })}
              />
              <Num
                label="Total Watering Days"
                value={row.total_watering_days}
                onChange={(v) => update({ total_watering_days: v })}
              />
              <Num
                label="Total Raining Days"
                value={row.total_raining_days}
                onChange={(v) => update({ total_raining_days: v })}
              />
              <Num
                label="Full-time Gardeners"
                value={row.full_time_gardeners}
                onChange={(v) => update({ full_time_gardeners: v })}
              />
              <Num
                label="Part-time Gardeners"
                value={row.part_time_gardeners}
                onChange={(v) => update({ part_time_gardeners: v })}
              />
              <Num
                label="Total Part-time Labour Days"
                value={row.total_part_time_labour_days}
                onChange={(v) => update({ total_part_time_labour_days: v })}
              />
            </FieldGrid>
          )}
        />
      </SectionShell>
    </>
  );
}
