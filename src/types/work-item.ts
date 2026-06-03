/** User-facing work item type selection (includes auto-detect). */
export const WORK_ITEM_TYPE_SELECTIONS = [
  "auto",
  "feature",
  "bug",
  "enhancement",
  "technical_change",
] as const;

export type WorkItemTypeSelection = (typeof WORK_ITEM_TYPE_SELECTIONS)[number];

/** Classified / effective work item types returned by the agent. */
export const WORK_ITEM_TYPES = [
  "feature",
  "bug",
  "enhancement",
  "technical_change",
  "unknown",
] as const;

export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

export const CONFIDENCE_LEVELS = ["High", "Medium", "Low"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const WORK_ITEM_TYPE_LABELS: Record<WorkItemTypeSelection, string> = {
  auto: "Auto-detect",
  feature: "Feature",
  bug: "Bug",
  enhancement: "Enhancement",
  technical_change: "Technical Change",
};

export const DETECTED_TYPE_LABELS: Record<WorkItemType, string> = {
  feature: "Feature",
  bug: "Bug",
  enhancement: "Enhancement",
  technical_change: "Technical Change",
  unknown: "Unknown",
};

export function isWorkItemTypeSelection(
  value: string
): value is WorkItemTypeSelection {
  return (WORK_ITEM_TYPE_SELECTIONS as readonly string[]).includes(value);
}

export function isWorkItemType(value: string): value is WorkItemType {
  return (WORK_ITEM_TYPES as readonly string[]).includes(value);
}

export function normalizeWorkItemType(value: string): WorkItemType {
  const normalized = value.toLowerCase().replace(/\s+/g, "_");
  if (normalized === "technical" || normalized === "tech_change") {
    return "technical_change";
  }
  if (isWorkItemType(normalized)) return normalized;
  return "unknown";
}
