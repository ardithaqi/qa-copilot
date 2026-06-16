import { generateWithOpenAICompatible } from "@/lib/llm/openai-compatible";
import type { GenerateQaAnalysisFn } from "@/lib/llm/types";

const DEFAULT_MODEL = "gpt-4o-mini";

function getModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

export const generateQaAnalysis: GenerateQaAnalysisFn = async (params) => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  return generateWithOpenAICompatible(params, {
    apiKey,
    model: getModel(),
    provider: "openai",
  });
};
