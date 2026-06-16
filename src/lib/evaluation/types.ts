import type { UiLlmProviderId } from "@/lib/llm/types";
import type { LlmUsageSummary } from "@/lib/llm/usage-types";
import type { MediaAttachment } from "@/types/attachments";
import type { QAAnalysis } from "@/types/qa-analysis";

export interface LlmEvaluationRun {
  coveragePercent: number;
  qualityScore: number;
  summary: string;
  missingScenarios: string[];
  missingEdgeCases: string[];
  missingApiValidations: string[];
  missingRisks: string[];
  strengths: string[];
  improvementSuggestions: string[];
}

export interface EvaluationScoreStats {
  evaluationRuns: number;
  coverageMedian: number;
  coverageAverage: number;
  coverageMin: number;
  coverageMax: number;
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

export interface EvaluationResult extends LlmEvaluationRun {
  /** Primary display score — median coverage across runs. */
  coveragePercent: number;
  /** Final quality — median LLM quality minus hard-check penalties. */
  qualityScore: number;
  /** Median LLM quality before hard-check adjustment. */
  llmQualityMedian: number;
  scores: EvaluationScoreStats;
  hardChecks: HardCheckResult[];
  hardCheckPenalty: number;
  method: "llm+hardened";
}

export interface EvaluateRequest {
  analysis: QAAnalysis;
  requirement: string;
  provider: UiLlmProviderId;
  attachments?: MediaAttachment[];
}

export interface EvaluateSuccessResponse {
  evaluation: EvaluationResult;
  requirement: string;
  provider: UiLlmProviderId;
  usage: LlmUsageSummary;
}

export interface EvaluateErrorResponse {
  error: string;
}
