import { generateQaAnalysis as generateWithGemini } from "@/lib/llm/gemini";
import { generateQaAnalysis as generateWithGroq } from "@/lib/llm/groq";
import { generateQaAnalysis as generateWithLocal } from "@/lib/llm/local";
import { generateQaAnalysis as generateWithOpenAI } from "@/lib/llm/openai";
import type {
  GenerateQaAnalysisFn,
  GenerateQaAnalysisParams,
  LlmProviderId,
  UiLlmProviderId,
} from "@/lib/llm/types";
import type { LlmCallResult } from "@/lib/llm/usage-types";
import { isUiLlmProvider, UI_LLM_PROVIDERS } from "@/lib/llm/types";

const providers: Record<LlmProviderId, GenerateQaAnalysisFn> = {
  groq: generateWithGroq,
  openai: generateWithOpenAI,
  gemini: generateWithGemini,
  local: generateWithLocal,
};

export function assertUiProviderSupported(
  provider: string
): asserts provider is UiLlmProviderId {
  if (!isUiLlmProvider(provider)) {
    throw new Error(
      `UNSUPPORTED_PROVIDER: Provider "${provider}" is not supported. Choose one of: ${UI_LLM_PROVIDERS.join(", ")}.`
    );
  }
}

export async function generateQaAnalysis(
  provider: UiLlmProviderId,
  params: GenerateQaAnalysisParams
): Promise<LlmCallResult> {
  return providers[provider](params);
}

export {
  UI_LLM_PROVIDERS,
  isUiLlmProvider,
  type GenerateQaAnalysisParams,
  type UiLlmProviderId,
  type LlmProviderId,
};
export {
  estimateCostUsd,
  formatEstimatedCost,
  formatTokenCount,
  formatUsageSummaryLine,
  logUsageSummary,
  mergeUsageSummaries,
  summarizeLlmUsage,
} from "@/lib/llm/usage-cost";
export type {
  LlmCallResult,
  LlmTokenUsage,
  LlmUsageSummary,
} from "@/lib/llm/usage-types";
