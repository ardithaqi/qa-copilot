import OpenAI from "openai";
import type { GenerateQaAnalysisParams } from "@/lib/llm/types";

export async function generateWithOpenAICompatible(
  params: GenerateQaAnalysisParams,
  options: { apiKey: string; baseURL?: string; model: string }
): Promise<string> {
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseURL,
  });

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: options.model,
      temperature: 0.3,
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
    });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(error.message);
    }
    throw error;
  }

  const content = completion.choices[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("No analysis was returned from the AI service.");
  }

  return content;
}
