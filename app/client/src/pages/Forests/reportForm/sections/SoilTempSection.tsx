import { SectionShell, FieldGrid, Num, Url, Dt, RepeatableRows, type SectionProps } from '../kit';

export function SoilTempSection({ draft, patch }: SectionProps) {
  return (
    <>
      <SectionShell title="Soil pH & Temperature" desc="Quarterly soil pH meter readings and temperature/humidity readings.">
        <RepeatableRows
          label="Soil pH Level"
          items={draft.soil_ph_level}
          onChange={(next) => patch({ soil_ph_level: next })}
          blank={() => ({ year: 0, quarter: 1 })}
          addLabel="Add pH reading"
          rowTitle={(row) => `${row.year ?? 0} Q${row.quarter ?? 0}`}
          renderRow={(row, update) => (
            <FieldGrid cols={2}>
              <Num label="Year" value={row.year} onChange={(v) => update({ year: v ?? 0 })} />
              <Num label="Quarter" value={row.quarter} onChange={(v) => update({ quarter: v ?? 0 })} />
              <Dt label="Reading Date" value={row.reading_date} onChange={(v) => update({ reading_date: v })} />
              <Url label="Meter Image" value={row.meter_image} onChange={(v) => update({ meter_image: v })} />
              <Num label="Before-plantation pH" value={row.before_reading} onChange={(v) => update({ before_reading: v })} />
              <Num label="Meter Reading (after)" value={row.meter_reading} onChange={(v) => update({ meter_reading: v })} />
            </FieldGrid>
          )}
        />

        <RepeatableRows
          label="Temperature & Humidity"
          items={draft.temperature_humidity}
          onChange={(next) => patch({ temperature_humidity: next })}
          blank={() => ({ year: 0, quarter: 1 })}
          addLabel="Add temperature reading"
          rowTitle={(row) => `${row.year ?? 0} Q${row.quarter ?? 0}`}
          renderRow={(row, update) => (
            <>
              <FieldGrid cols={3}>
                <Num label="Year" value={row.year} onChange={(v) => update({ year: v ?? 0 })} />
                <Num label="Quarter" value={row.quarter} onChange={(v) => update({ quarter: v ?? 0 })} />
                <Dt label="Reading Date" value={row.reading_date} onChange={(v) => update({ reading_date: v })} />
              </FieldGrid>
              <FieldGrid cols={3}>
                <Url
                  label="Inside Plantation Image"
                  value={row.inside_plantation?.image}
                  onChange={(v) => update({ inside_plantation: { ...row.inside_plantation, image: v } })}
                />
                <Num
                  label="Inside Humidity"
                  value={row.inside_plantation?.humidity}
                  onChange={(v) => update({ inside_plantation: { ...row.inside_plantation, humidity: v } })}
                />
                <Num
                  label="Inside Temperature"
                  value={row.inside_plantation?.temperature}
                  onChange={(v) => update({ inside_plantation: { ...row.inside_plantation, temperature: v } })}
                />
              </FieldGrid>
              <FieldGrid cols={3}>
                <Url
                  label="Outside Plantation Image"
                  value={row.outside_plantation?.image}
                  onChange={(v) => update({ outside_plantation: { ...row.outside_plantation, image: v } })}
                />
                <Num
                  label="Outside Humidity"
                  value={row.outside_plantation?.humidity}
                  onChange={(v) => update({ outside_plantation: { ...row.outside_plantation, humidity: v } })}
                />
                <Num
                  label="Outside Temperature"
                  value={row.outside_plantation?.temperature}
                  onChange={(v) => update({ outside_plantation: { ...row.outside_plantation, temperature: v } })}
                />
              </FieldGrid>
            </>
          )}
        />
      </SectionShell>
    </>
  );
}
