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
    coverageAreaGaps: mergeCoverageAreaGaps(runs),
    accuracyIssues: mergeGapLists(runs, (run) => run.accuracyIssues),
    qualityIssues: mergeGapLists(runs, (run) => run.qualityIssues),
    strengths: unionUniqueStrings(runs.map((run) => run.strengths)),
    improvementSuggestions: unionUniqueStrings(
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
