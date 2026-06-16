import OpenAI from "openai";
import { buildOpenAIUserContent } from "@/lib/llm/multimodal";
import type { GenerateQaAnalysisParams } from "@/lib/llm/types";
import type { LlmCallResult } from "@/lib/llm/usage-types";
import type { UiLlmProviderId } from "@/lib/llm/types";

export async function generateWithOpenAICompatible(
  params: GenerateQaAnalysisParams,
  options: {
    apiKey: string;
    baseURL?: string;
    model: string;
    provider: UiLlmProviderId;
  }
): Promise<LlmCallResult> {
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseURL,
  });

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: options.model,
      temperature: params.temperature ?? 0.3,
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: params.systemPrompt },
        {
          role: "user",
          content: buildOpenAIUserContent(params.userPrompt, params.attachments),
        },
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

  const usage = completion.usage;

  return {
    content,
    model: options.model,
    provider: options.provider,
    usage: {
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    },
  };
}
