import type { UiLlmProviderId } from "@/lib/llm/types";

export interface LlmTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface LlmCallResult {
  content: string;
  usage: LlmTokenUsage;
  model: string;
  provider: UiLlmProviderId;
}

export interface LlmUsageSummary {
  llmCalls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  model: string;
  provider: UiLlmProviderId;
  /** True when cost is computed from published list prices (not live billing). */
  isEstimate: boolean;
}
