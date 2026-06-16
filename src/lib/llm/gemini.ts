import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateQaAnalysisFn } from "@/lib/llm/types";

const DEFAULT_MODEL = "gemini-2.0-flash";

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export const generateQaAnalysis: GenerateQaAnalysisFn = async (params) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const modelName = getModel();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: params.temperature ?? 0.3,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
    systemInstruction: params.systemPrompt,
  });

  const result = await model.generateContent(params.userPrompt);
  const text = result.response.text();

  if (!text?.trim()) {
    throw new Error("No analysis was returned from the AI service.");
  }

  const metadata = result.response.usageMetadata;
  const inputTokens = metadata?.promptTokenCount ?? 0;
  const outputTokens = metadata?.candidatesTokenCount ?? 0;

  return {
    content: text,
    model: modelName,
    provider: "gemini",
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: metadata?.totalTokenCount ?? inputTokens + outputTokens,
    },
  };
};
