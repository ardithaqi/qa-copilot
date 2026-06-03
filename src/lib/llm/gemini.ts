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

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: getModel(),
    generationConfig: {
      temperature: 0.3,
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

  return text;
};
