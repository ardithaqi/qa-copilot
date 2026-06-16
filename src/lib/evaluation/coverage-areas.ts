export const COVERAGE_AREA_IDS = [
  "validation",
  "failure_handling",
  "api",
  "edge",
  "permissions",
  "regression",
  "data_integrity",
  "persistence",
  "downstream_impact",
] as const;

export type CoverageAreaId = (typeof COVERAGE_AREA_IDS)[number];

export interface CoverageAreaGap {
  area: CoverageAreaId;
  note: string;
}

export const COVERAGE_AREA_LABELS: Record<CoverageAreaId, string> = {
  validation: "Validation coverage",
  failure_handling: "Failure handling coverage",
  api: "API coverage",
  edge: "Edge coverage",
  permissions: "Permission coverage",
  regression: "Regression coverage",
  data_integrity: "Data integrity coverage",
  persistence: "State persistence coverage",
  downstream_impact: "Downstream impact coverage",
};

const AREA_ALIASES: Record<string, CoverageAreaId> = {
  validation: "validation",
  validation_coverage: "validation",
  failure_handling: "failure_handling",
  failure: "failure_handling",
  failure_handling_coverage: "failure_handling",
  api: "api",
  api_coverage: "api",
  api_verification: "api",
  edge: "edge",
  edge_coverage: "edge",
  permissions: "permissions",
  permission: "permissions",
  permission_coverage: "permissions",
  regression: "regression",
  regression_coverage: "regression",
  data_integrity: "data_integrity",
  data_integrity_coverage: "data_integrity",
  persistence: "persistence",
  state_persistence: "persistence",
  state_persistence_coverage: "persistence",
  downstream_impact: "downstream_impact",
  downstream: "downstream_impact",
  downstream_impact_coverage: "downstream_impact",
};

export function normalizeCoverageAreaId(value: string): CoverageAreaId | null {
  const key = value.trim().toLowerCase().replace(/\s+/g, "_");
  return AREA_ALIASES[key] ?? null;
}

export function formatCoverageAreaGap(gap: CoverageAreaGap): string {
  return `${COVERAGE_AREA_LABELS[gap.area]}: ${gap.note}`;
}
