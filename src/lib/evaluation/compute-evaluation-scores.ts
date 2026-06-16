import {
  ACCURACY_ISSUE_PENALTY,
  COVERAGE_GAP_PENALTY,
  QUALITY_ISSUE_PENALTY,
  QUALITY_STRENGTH_BONUS_CAP,
  QUALITY_STRENGTH_BONUS_PER,
} from "@/lib/evaluation/constants";
import type { CoverageAreaGap } from "@/lib/evaluation/coverage-areas";

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeCoverageBaseScore(gapCount: number): number {
  return clampScore(100 - COVERAGE_GAP_PENALTY * gapCount);
}

export function computeAccuracyScore(issueCount: number): number {
  return clampScore(100 - ACCURACY_ISSUE_PENALTY * issueCount);
}

export function computeQualityScore(
  issueCount: number,
  strengthCount: number
): number {
  const bonus = Math.min(
    QUALITY_STRENGTH_BONUS_CAP,
    strengthCount * QUALITY_STRENGTH_BONUS_PER
  );
  return clampScore(100 - QUALITY_ISSUE_PENALTY * issueCount + bonus);
}

export function computeCoverageBaseScoreFromGaps(gaps: CoverageAreaGap[]): number {
  return computeCoverageBaseScore(gaps.length);
}
