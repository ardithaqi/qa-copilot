/** Providers exposed in the UI selector. */
export const UI_LLM_PROVIDERS = ["groq", "openai", "gemini"] as const;
export type UiLlmProviderId = (typeof UI_LLM_PROVIDERS)[number];

/** All provider ids including future local/Llama support. */
export const LLM_PROVIDERS = [...UI_LLM_PROVIDERS, "local"] as const;
export type LlmProviderId = (typeof LLM_PROVIDERS)[number];

import type { LlmCallResult } from "@/lib/llm/usage-types";
import type { MediaAttachment } from "@/types/attachments";

export interface GenerateQaAnalysisParams {
  input: string;
  systemPrompt: string;
  userPrompt: string;
  /** Defaults to 0.3 for generation; evaluator uses a lower value. */
  temperature?: number;
  /** Optional screenshots or screen recording for multimodal providers. */
  attachments?: MediaAttachment[];
}

export type GenerateQaAnalysisFn = (
  params: GenerateQaAnalysisParams
) => Promise<LlmCallResult>;

export function isUiLlmProvider(value: string): value is UiLlmProviderId {
  return (UI_LLM_PROVIDERS as readonly string[]).includes(value);
}
