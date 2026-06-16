import type {
  CoverageBreakdown,
  CoverageBreakdownMissingItem,
  EvaluationResult,
} from "@/lib/evaluation/types";

export type { CoverageBreakdownMissingItem };

export interface CoverageBreakdownGroup {
  title: string;
  covered: string[];
  missing: CoverageBreakdownMissingItem[];
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

function formatThemeTitle(theme: string): string {
  const trimmed = theme.trim();
  if (!trimmed) {
    return "Feature coverage";
  }
  if (/\bcoverage$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} coverage`;
}

function hasBreakdownContent(breakdown: CoverageBreakdown): boolean {
  return breakdown.covered.length > 0 || breakdown.missing.length > 0;
}

export function buildCoverageBreakdown(
  evaluation: EvaluationResult
): CoverageBreakdownGroup[] {
  const { coverageTheme, coverageBreakdown } = evaluation;

  if (!coverageTheme && !hasBreakdownContent(coverageBreakdown)) {
    return [];
  }

  return [
    {
      title: formatThemeTitle(coverageTheme),
      covered: dedupeCovered(coverageBreakdown.covered),
      missing: dedupeMissing(
        coverageBreakdown.missing.map((item) => ({
          label: item.label,
          note: item.note.trim() || `Coverage for ${item.label.toLowerCase()} appears limited.`,
        }))
      ),
    },
  ];
}
