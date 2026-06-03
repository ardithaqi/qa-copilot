import { generateQaAnalysis, type UiLlmProviderId } from "@/lib/llm";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";
import type { WorkItemTypeSelection } from "@/types/work-item";

export async function generateAnalysisJson(
  input: string,
  provider: UiLlmProviderId,
  workItemType: WorkItemTypeSelection
): Promise<string> {
  return generateQaAnalysis(provider, {
    input,
    systemPrompt: buildSystemPrompt(),
    userPrompt: buildUserPrompt(input, workItemType),
  });
}
