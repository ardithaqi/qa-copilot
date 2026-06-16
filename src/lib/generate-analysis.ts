import {
  validateAttachments,
  validateAttachmentsForProvider,
} from "@/lib/attachments";
import { generateQaAnalysis, type UiLlmProviderId } from "@/lib/llm";
import type { LlmCallResult } from "@/lib/llm/usage-types";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";
import type { MediaAttachment } from "@/types/attachments";
import type { WorkItemTypeSelection } from "@/types/work-item";

export async function generateAnalysis(
  input: string,
  provider: UiLlmProviderId,
  workItemType: WorkItemTypeSelection,
  attachments: MediaAttachment[] = []
): Promise<LlmCallResult> {
  validateAttachments(attachments);
  validateAttachmentsForProvider(attachments, provider);

  return generateQaAnalysis(provider, {
    input,
    systemPrompt: buildSystemPrompt(),
    userPrompt: buildUserPrompt(input, workItemType),
    attachments,
  });
}

/** @deprecated Use generateAnalysis — returns content only for legacy callers. */
export async function generateAnalysisJson(
  input: string,
  provider: UiLlmProviderId,
  workItemType: WorkItemTypeSelection
): Promise<string> {
  const result = await generateAnalysis(input, provider, workItemType);
  return result.content;
}
