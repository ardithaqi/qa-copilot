import {
  COVERAGE_AREA_LABELS,
  type CoverageAreaGap,
  type CoverageAreaId,
} from "@/lib/evaluation/coverage-areas";
import type { EvaluationResult, HardCheckResult } from "@/lib/evaluation/types";

export interface CoverageBreakdownMissingItem {
  label: string;
  note: string;
}

export interface CoverageBreakdownGroup {
  title: string;
  covered: string[];
  missing: CoverageBreakdownMissingItem[];
}

const GAP_BREAKDOWN_LABELS: Record<CoverageAreaId, string> = {
  validation: "Validation coverage",
  failure_handling: "Failure handling coverage",
  api: "Backend/API validation coverage",
  edge: "Duplicate-action handling coverage",
  permissions: "Permission coverage",
  regression: "Regression coverage",
  data_integrity: "Data integrity coverage",
  persistence: "Persistence coverage",
  downstream_impact: "Downstream impact coverage",
};

const GAP_EXPLANATIONS: Record<CoverageAreaId, string> = {
  validation: "Invalid or required input scenarios are missing or incomplete.",
  failure_handling:
    "Server, network, or error handling during the operation is not adequately covered.",
  api: "No verification that the save operation is persisted correctly at the backend level.",
  edge: "Rapid repeat submit or duplicate-action behavior is not addressed.",
  permissions: "Permission or access-control scenarios relevant to this flow are not covered.",
  regression: "Adjacent or related behavior that could regress is not checked.",
  data_integrity: "Data correctness or integrity after the operation is not verified.",
  persistence: "Saved state is not verified after refresh, navigation, or session change.",
  downstream_impact: "Downstream systems or side effects are not considered in the test design.",
};

const CRITERION_EXPLANATIONS: Record<string, string> = {
  "Core success flow":
    "The successful save or update path is not clearly represented in the test design.",
  Persistence:
    "Persistence after refresh, navigation, or session change is not verified.",
  Validation: "Invalid or required input validation is missing or incomplete.",
  "Failure handling":
    "Server, network, or error handling during the operation is not covered.",
  "Valid email flow": "A valid registered email happy path is not covered.",
  "Invalid email handling": "Invalid or unregistered email handling is not covered.",
  "Empty email handling": "Empty or missing email validation is not covered.",
  "Expired link handling": "Expired reset link or token behavior is not covered.",
  "Reused link handling": "Reused reset link or token behavior is not covered.",
  "Upload within limit": "Uploading at or under the allowed limit is not covered.",
  "Over-limit upload": "Exceeding the upload limit is not covered.",
  "Invalid file type": "Invalid file type rejection is not covered.",
  "Oversized file": "Oversized file rejection is not covered.",
};

function formatRuleTitle(ruleLabel: string): string {
  if (ruleLabel.endsWith(" flow")) {
    return ruleLabel.replace(/ flow$/, " coverage");
  }
  if (ruleLabel === "Password reset via email") {
    return "Password reset coverage";
  }
  if (ruleLabel === "Image upload limit") {
    return "Image upload coverage";
  }
  return `${ruleLabel} coverage`;
}

function formatCriterionLabel(label: string): string {
  const map: Record<string, string> = {
    "Core success and persistence coverage": "Core success flow",
    "Core success flow": "Core success flow",
    Persistence: "Persistence",
    "Validation coverage": "Validation",
    "Failure handling coverage": "Failure handling",
    "Valid email / happy path": "Valid email flow",
    "Invalid or unregistered email": "Invalid email handling",
    "Empty or missing email": "Empty email handling",
    "Expired reset link or token": "Expired link handling",
    "Reused reset link or token": "Reused link handling",
    "Upload at or under the limit": "Upload within limit",
    "Exceeding the upload limit": "Over-limit upload",
    "Invalid file type": "Invalid file type",
    "Oversized file": "Oversized file",
  };
  return map[label] ?? label;
}

function oneSentence(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return trimmed;
  }
  const match = trimmed.match(/^(.+?[.!?])(?:\s|$)/);
  if (match) {
    return match[1];
  }
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}

function explanationForCriterion(label: string): string {
  return CRITERION_EXPLANATIONS[label] ?? `Coverage for ${label.toLowerCase()} appears limited.`;
}

function explanationForGap(gap: CoverageAreaGap): string {
  const fromGap = gap.note.trim();
  if (fromGap && !/^add a test/i.test(fromGap)) {
    return oneSentence(fromGap);
  }
  return GAP_EXPLANATIONS[gap.area];
}

function gapToBreakdownLabel(area: CoverageAreaId): string {
  return GAP_BREAKDOWN_LABELS[area] ?? COVERAGE_AREA_LABELS[area];
}

function isSimilarLabel(a: string, b: string): boolean {
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  return na === nb || na.includes(nb) || nb.includes(na);
}

function dedupeCovered(labels: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const label of labels) {
    const key = label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(label);
  }
  return result;
}

function dedupeMissing(items: CoverageBreakdownMissingItem[]): CoverageBreakdownMissingItem[] {
  const seen = new Set<string>();
  const result: CoverageBreakdownMissingItem[] = [];
  for (const item of items) {
    const key = item.label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function mergeLlmGapsIntoMissing(
  missing: CoverageBreakdownMissingItem[],
  covered: string[],
  gaps: EvaluationResult["coverageAreaGaps"]
): CoverageBreakdownMissingItem[] {
  const merged = [...missing];
  for (const gap of gaps) {
    const label = gapToBreakdownLabel(gap.area);
    if (covered.some((item) => isSimilarLabel(item, label))) {
      continue;
    }
    if (merged.some((item) => isSimilarLabel(item.label, label))) {
      continue;
    }
    merged.push({
      label,
      note: explanationForGap(gap),
    });
  }
  return merged;
}

function groupFromHardCheck(
  check: HardCheckResult,
  llmGaps: EvaluationResult["coverageAreaGaps"],
  attachLlmGaps: boolean
): CoverageBreakdownGroup {
  const covered = dedupeCovered(
    check.criteria.filter((c) => c.passed).map((c) => formatCriterionLabel(c.label))
  );
  let missing = dedupeMissing(
    check.criteria
      .filter((c) => !c.passed)
      .map((c) => {
        const label = formatCriterionLabel(c.label);
        return {
          label,
          note: explanationForCriterion(label),
        };
      })
  );
  if (attachLlmGaps) {
    missing = dedupeMissing(mergeLlmGapsIntoMissing(missing, covered, llmGaps));
  }
  return {
    title: formatRuleTitle(check.ruleLabel),
    covered,
    missing,
  };
}

export function buildCoverageBreakdown(
  evaluation: EvaluationResult
): CoverageBreakdownGroup[] {
  const { hardChecks, coverageAreaGaps } = evaluation;

  if (hardChecks.length === 0 && coverageAreaGaps.length === 0) {
    return [];
  }

  if (hardChecks.length === 0) {
    return [
      {
        title: "Coverage assessment",
        covered: [],
        missing: dedupeMissing(
          coverageAreaGaps.map((gap) => ({
            label: gapToBreakdownLabel(gap.area),
            note: explanationForGap(gap),
          }))
        ),
      },
    ];
  }

  const primaryRuleId = hardChecks[0]?.ruleId;
  return hardChecks.map((check) =>
    groupFromHardCheck(
      check,
      coverageAreaGaps,
      check.ruleId === primaryRuleId
    )
  );
}
