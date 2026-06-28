## ADDED Requirements

### Requirement: Value-flow figures are computed from the operator's formula

The system SHALL compute the forest value-flow figures — land value, tree value,
oxygen generated, and carbon sequestration across short/medium/long term
(`forest_value_flow_impact_report`) and the approximate-value slide — from the
operator's supplied formula table rather than requiring manual entry. The formula
inputs (saplings, species oxygen/carbon, land area, project period, ₹ rates) MUST
come from existing forest data plus the operator's constants. Computed values MUST
be labelled as estimated and remain operator-overridable.

> Note: this requirement is blocked on the operator's Excel formula table. Whether
> the formula also replaces the report's current per-day × 365 × 0.25 oxygen/carbon
> method, or only fills the value-flow section, is decided on review of the Excel.

#### Scenario: Value-flow auto-populated

- **WHEN** a report is built for a forest with the required inputs present
- **THEN** the value-flow figures and approximate-value totals are computed from
  the encoded formula, shown with an "Estimated" label, and can be overridden

#### Scenario: Missing inputs render blank, not zero

- **WHEN** an input the formula needs is absent
- **THEN** the affected value renders blank ("—"), never a fabricated zero
