import type { CoverageAreaGap } from "@/lib/evaluation/coverage-areas";
import type { UiLlmProviderId } from "@/lib/llm/types";
import type { LlmUsageSummary } from "@/lib/llm/usage-types";
import type { MediaAttachment } from "@/types/attachments";
import type { QAAnalysis } from "@/types/qa-analysis";

export type { CoverageAreaGap };
export type { CoverageAreaId } from "@/lib/evaluation/coverage-areas";

export interface CoverageBreakdownMissingItem {
  label: string;
  note: string;
}

export interface CoverageBreakdown {
  covered: string[];
  missing: CoverageBreakdownMissingItem[];
}

export interface LlmEvaluationRun {
  summary: string;
  /** Business workflow name for coverage breakdown title (e.g. "Profile update"). */
  coverageTheme: string;
  coverageBreakdown: CoverageBreakdown;
  coverageAreaGaps: CoverageAreaGap[];
  accuracyIssues: string[];
  qualityIssues: string[];
  strengths: string[];
  improvementSuggestions: string[];
  /** Raw scores from LLM JSON when present — debug only; not used for displayed score. */
  llmReportedCoverage?: number;
  llmReportedAccuracy?: number;
  llmReportedQuality?: number;
}

export interface EvaluationScoreStats {
  evaluationRuns: number;
  coverageMedian: number;
  coverageAverage: number;
  coverageMin: number;
  coverageMax: number;
  accuracyMedian: number;
  accuracyAverage: number;
  accuracyMin: number;
  accuracyMax: number;
  qualityMedian: number;
  qualityAverage: number;
  qualityMin: number;
  qualityMax: number;
}

export interface HardCheckCriterionResult {
  label: string;
  passed: boolean;
}

export interface HardCheckResult {
  ruleId: string;
  ruleLabel: string;
  passed: boolean;
  criteria: HardCheckCriterionResult[];
}

export interface EvaluationResult {
  summary: string;
  coverageTheme: string;
  coverageBreakdown: CoverageBreakdown;
  coverageAreaGaps: CoverageAreaGap[];
  accuracyIssues: string[];
  qualityIssues: string[];
  strengths: string[];
  improvementSuggestions: string[];
  /** Final coverage after hard-check penalty. */
  coveragePercent: number;
  /** Coverage from merged gaps before hard-check penalty. */
  coverageBaseScore: number;
  accuracyScore: number;
  qualityScore: number;
  /** Median of raw LLM-reported scores across runs — debug metadata only. */
  llmCoverageMedian?: number;
  llmAccuracyMedian?: number;
  llmQualityMedian?: number;
  scores: EvaluationScoreStats;
  hardChecks: HardCheckResult[];
  hardCheckPenalty: number;
  method: "llm+hardened";
}

export interface EvaluateRequest {
  analysis: QAAnalysis;
  /** User's raw ticket/requirement only — not analyzer or evaluator prompts. */
  originalWorkItem: string;
  /** @deprecated Use originalWorkItem */
  requirement?: string;
  provider: UiLlmProviderId;
  attachments?: MediaAttachment[];
}

export interface EvaluateSuccessResponse {
  evaluation: EvaluationResult;
  originalWorkItem: string;
  provider: UiLlmProviderId;
  usage: LlmUsageSummary;
}

export interface EvaluateErrorResponse {
  error: string;
}
