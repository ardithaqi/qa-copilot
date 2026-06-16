import {
  HARD_CHECK_PENALTY_PER_FAILURE,
} from "@/lib/evaluation/constants";
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

function applyHardCheckPenalty(
  llmQualityMedian: number,
  hardChecks: HardCheckResult[]
): { qualityScore: number; hardCheckPenalty: number } {
  const failedCriteria = countFailedHardCheckCriteria(hardChecks);
  const hardCheckPenalty = failedCriteria * HARD_CHECK_PENALTY_PER_FAILURE;
  const qualityScore = Math.max(0, llmQualityMedian - hardCheckPenalty);
  return { qualityScore, hardCheckPenalty };
}

export function aggregateEvaluationRuns(
  runs: LlmEvaluationRun[],
  requirement: string,
  analysis: QAAnalysis
): EvaluationResult {
  const coverages = runs.map((run) => run.coveragePercent);
  const accuracies = runs.map((run) => run.accuracyScore);
  const qualities = runs.map((run) => run.qualityScore);
  const coverageMedian = median(coverages);
  const qualityMedian = median(qualities);
  const accuracyMedian = median(accuracies);
  const hardChecks = runHardChecks(requirement, analysis);
  const { qualityScore, hardCheckPenalty } = applyHardCheckPenalty(
    qualityMedian,
    hardChecks
  );

  const consistentMissingScenarios = itemsInMultipleRuns(
    runs.map((run) => run.missingScenarios)
  );
  const consistentMissingEdgeCases = itemsInMultipleRuns(
    runs.map((run) => run.missingEdgeCases)
  );
  const consistentMissingApiValidations = itemsInMultipleRuns(
    runs.map((run) => run.missingApiValidations)
  );
  const consistentMissingRisks = itemsInMultipleRuns(runs.map((run) => run.missingRisks));
  const consistentAccuracyIssues = itemsInMultipleRuns(
    runs.map((run) => run.accuracyIssues)
  );

  return {
    coveragePercent: coverageMedian,
    accuracyScore: accuracyMedian,
    qualityScore,
    llmQualityMedian: qualityMedian,
    summary: pickRepresentativeSummary(runs, qualityMedian),
    missingScenarios:
      consistentMissingScenarios.length > 0
        ? consistentMissingScenarios
        : unionUniqueStrings(runs.map((run) => run.missingScenarios)),
    missingEdgeCases:
      consistentMissingEdgeCases.length > 0
        ? consistentMissingEdgeCases
        : unionUniqueStrings(runs.map((run) => run.missingEdgeCases)),
    missingApiValidations:
      consistentMissingApiValidations.length > 0
        ? consistentMissingApiValidations
        : unionUniqueStrings(runs.map((run) => run.missingApiValidations)),
    missingRisks:
      consistentMissingRisks.length > 0
        ? consistentMissingRisks
        : unionUniqueStrings(runs.map((run) => run.missingRisks)),
    accuracyIssues:
      consistentAccuracyIssues.length > 0
        ? consistentAccuracyIssues
        : unionUniqueStrings(runs.map((run) => run.accuracyIssues)),
    strengths: unionUniqueStrings(runs.map((run) => run.strengths)),
    improvementSuggestions: unionUniqueStrings(
      runs.map((run) => run.improvementSuggestions)
    ),
    scores: {
      evaluationRuns: runs.length,
      coverageMedian,
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
