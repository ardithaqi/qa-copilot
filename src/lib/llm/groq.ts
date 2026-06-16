import { generateWithOpenAICompatible } from "@/lib/llm/openai-compatible";
import type { GenerateQaAnalysisFn } from "@/lib/llm/types";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

function getModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
}

export const generateQaAnalysis: GenerateQaAnalysisFn = async (params) => {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  return generateWithOpenAICompatible(params, {
    apiKey,
    baseURL: GROQ_BASE_URL,
    model: getModel(),
    provider: "groq",
  });
};
