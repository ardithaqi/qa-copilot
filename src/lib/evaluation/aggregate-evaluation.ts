import {
  HARD_CHECK_PENALTY_PER_FAILURE,
} from "@/lib/evaluation/constants";
import type { CoverageAreaGap } from "@/lib/evaluation/coverage-areas";
import { COVERAGE_AREA_IDS } from "@/lib/evaluation/coverage-areas";
import {
  countFailedHardCheckCriteria,
  runHardChecks,
} from "@/lib/evaluation/hard-checks";
import type {
  CoverageBreakdown,
  CoverageBreakdownMissingItem,
  EvaluationResult,
  HardCheckResult,
  LlmEvaluationRun,
} from "@/lib/evaluation/types";
import type { QAAnalysis } from "@/types/qa-analysis";

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function unionUniqueStrings(arrays: string[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const array of arrays) {
    for (const item of array) {
      const key = item.toLowerCase().trim();
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)
  );
}

function areSimilarSuggestions(a: string, b: string): boolean {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (!na || !nb) {
    return false;
  }
  if (na === nb) {
    return true;
  }
  if (na.includes(nb) || nb.includes(na)) {
    return true;
  }

  const wordsA = tokenSet(na);
  const wordsB = tokenSet(nb);
  if (wordsA.size === 0 || wordsB.size === 0) {
    return false;
  }

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) {
      intersection += 1;
    }
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union >= 0.55;
}

function unionUniqueSimilarStrings(arrays: string[][]): string[] {
  const result: string[] = [];

  for (const array of arrays) {
    for (const item of array) {
      const trimmed = item.trim();
      if (!trimmed) {
        continue;
      }
      if (result.some((existing) => areSimilarSuggestions(existing, trimmed))) {
        continue;
      }
      result.push(trimmed);
    }
  }

  return result;
}

function itemsInMultipleRuns(arrays: string[][], minRuns = 2): string[] {
  const counts = new Map<string, { count: number; label: string }>();

  for (const array of arrays) {
    const seenInRun = new Set<string>();
    for (const item of array) {
      const key = item.toLowerCase().trim();
      if (!key || seenInRun.has(key)) {
        continue;
      }
      seenInRun.add(key);
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { count: 1, label: item });
      }
    }
  }

  return [...counts.values()]
    .filter((entry) => entry.count >= minRuns)
    .map((entry) => entry.label);
}

function gapKey(gap: CoverageAreaGap): string {
  return `${gap.area}::${gap.note.toLowerCase().trim()}`;
}

function mergeCoverageAreaGaps(runs: LlmEvaluationRun[]): CoverageAreaGap[] {
  const areaCounts = new Map<
    string,
    { count: number; gap: CoverageAreaGap }
  >();

  for (const run of runs) {
    const seenInRun = new Set<string>();
    for (const gap of run.coverageAreaGaps) {
      const key = gapKey(gap);
      if (seenInRun.has(key)) {
        continue;
      }
      seenInRun.add(key);
      const existing = areaCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        areaCounts.set(key, { count: 1, gap });
      }
    }
  }

  const minRuns = runs.length > 1 ? 2 : 1;
  const merged = [...areaCounts.values()]
    .filter((entry) => entry.count >= minRuns)
    .map((entry) => entry.gap);

  if (merged.length > 0) {
    return merged.sort(
      (a, b) =>
        COVERAGE_AREA_IDS.indexOf(a.area) - COVERAGE_AREA_IDS.indexOf(b.area)
    );
  }

  const fallbackByArea = new Map<string, CoverageAreaGap>();
  for (const run of runs) {
    for (const gap of run.coverageAreaGaps) {
      if (!fallbackByArea.has(gap.area)) {
        fallbackByArea.set(gap.area, gap);
      }
    }
  }

  return COVERAGE_AREA_IDS.filter((id) => fallbackByArea.has(id)).map(
    (id) => fallbackByArea.get(id)!
  );
}

function pickRepresentativeSummary(
  runs: LlmEvaluationRun[],
  targetQuality: number
): string {
  let best = runs[0];
  let bestDistance = Math.abs(best.qualityScore - targetQuality);

  for (const run of runs.slice(1)) {
    const distance = Math.abs(run.qualityScore - targetQuality);
    if (distance < bestDistance) {
      best = run;
      bestDistance = distance;
    }
  }

  return best.summary;
}

function applyHardCheckPenaltyToCoverage(
  llmCoverageMedian: number,
  hardChecks: HardCheckResult[]
): { coveragePercent: number; hardCheckPenalty: number } {
  const failedCriteria = countFailedHardCheckCriteria(hardChecks);
  const hardCheckPenalty = failedCriteria * HARD_CHECK_PENALTY_PER_FAILURE;
  const coveragePercent = Math.max(0, llmCoverageMedian - hardCheckPenalty);
  return { coveragePercent, hardCheckPenalty };
}

function pickCoverageTheme(runs: LlmEvaluationRun[]): string {
  const counts = new Map<string, { count: number; label: string }>();

  for (const run of runs) {
    const theme = run.coverageTheme.trim();
    if (!theme) {
      continue;
    }
    const key = theme.toLowerCase();
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { count: 1, label: theme });
    }
  }

  if (counts.size === 0) {
    return "";
  }

  return [...counts.values()].sort((a, b) => b.count - a.count)[0]!.label;
}

function mergeMissingItems(
  runs: LlmEvaluationRun[]
): CoverageBreakdownMissingItem[] {
  const counts = new Map<
    string,
    { count: number; item: CoverageBreakdownMissingItem }
  >();

  for (const run of runs) {
    const seenInRun = new Set<string>();
    for (const item of run.coverageBreakdown.missing) {
      const key = item.label.toLowerCase().trim();
      if (!key || seenInRun.has(key)) {
        continue;
      }
      seenInRun.add(key);
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.item.note && item.note) {
          existing.item = item;
        }
      } else {
        counts.set(key, { count: 1, item });
      }
    }
  }

  const minRuns = runs.length > 1 ? 2 : 1;
  const consistent = [...counts.values()]
    .filter((entry) => entry.count >= minRuns)
    .map((entry) => entry.item);

  if (consistent.length > 0) {
    return consistent;
  }

  return unionUniqueMissing(runs.flatMap((run) => run.coverageBreakdown.missing));
}

function unionUniqueMissing(
  items: CoverageBreakdownMissingItem[]
): CoverageBreakdownMissingItem[] {
  const seen = new Set<string>();
  const result: CoverageBreakdownMissingItem[] = [];
  for (const item of items) {
    const key = item.label.toLowerCase().trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function mergeCoverageBreakdown(runs: LlmEvaluationRun[]): CoverageBreakdown {
  const coveredRuns = runs.map((run) => run.coverageBreakdown.covered);
  const consistentCovered = itemsInMultipleRuns(coveredRuns);
  const covered =
    consistentCovered.length > 0
      ? consistentCovered
      : unionUniqueStrings(coveredRuns);

  return {
    covered,
    missing: mergeMissingItems(runs),
  };
}

function mergeGapLists(
  runs: LlmEvaluationRun[],
  picker: (run: LlmEvaluationRun) => string[]
): string[] {
  const consistent = itemsInMultipleRuns(runs.map(picker));
  return consistent.length > 0 ? consistent : unionUniqueStrings(runs.map(picker));
}

export function aggregateEvaluationRuns(
  runs: LlmEvaluationRun[],
  originalWorkItem: string,
  analysis: QAAnalysis
): EvaluationResult {
  const coverages = runs.map((run) => run.coveragePercent);
  const accuracies = runs.map((run) => run.accuracyScore);
  const qualities = runs.map((run) => run.qualityScore);
  const llmCoverageMedian = median(coverages);
  const qualityMedian = median(qualities);
  const accuracyMedian = median(accuracies);
  const hardChecks = runHardChecks(originalWorkItem, analysis);
  const { coveragePercent, hardCheckPenalty } = applyHardCheckPenaltyToCoverage(
    llmCoverageMedian,
    hardChecks
  );

  return {
    coveragePercent,
    llmCoverageMedian,
    accuracyScore: accuracyMedian,
    qualityScore: qualityMedian,
    llmQualityMedian: qualityMedian,
    summary: pickRepresentativeSummary(runs, qualityMedian),
    coverageTheme: pickCoverageTheme(runs),
    coverageBreakdown: mergeCoverageBreakdown(runs),
    coverageAreaGaps: mergeCoverageAreaGaps(runs),
    accuracyIssues: mergeGapLists(runs, (run) => run.accuracyIssues),
    qualityIssues: mergeGapLists(runs, (run) => run.qualityIssues),
    strengths: unionUniqueStrings(runs.map((run) => run.strengths)),
    improvementSuggestions: unionUniqueSimilarStrings(
      runs.map((run) => run.improvementSuggestions)
    ),
    scores: {
      evaluationRuns: runs.length,
      coverageMedian: llmCoverageMedian,
      coverageAverage: average(coverages),
      coverageMin: Math.min(...coverages),
      coverageMax: Math.max(...coverages),
      accuracyMedian,
      accuracyAverage: average(accuracies),
      accuracyMin: Math.min(...accuracies),
      accuracyMax: Math.max(...accuracies),
      qualityMedian,
      qualityAverage: average(qualities),
      qualityMin: Math.min(...qualities),
      qualityMax: Math.max(...qualities),
    },
    hardChecks,
    hardCheckPenalty,
    method: "llm+hardened",
  };
}
