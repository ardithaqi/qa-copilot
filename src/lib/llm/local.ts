import type { GenerateQaAnalysisFn } from "@/lib/llm/types";

/**
 * Placeholder for future Ollama / local Llama support.
 * Wire to OLLAMA_BASE_URL + OpenAI-compatible client when implemented.
 */
export const generateQaAnalysis: GenerateQaAnalysisFn = async () => {
  throw new Error(
    "LOCAL_LLM_NOT_AVAILABLE: Local Llama/Ollama provider is not implemented yet. Select Groq, OpenAI, or Gemini in the UI."
  );
};
