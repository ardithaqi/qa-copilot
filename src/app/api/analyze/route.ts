import { NextResponse } from "next/server";
import { parseAttachmentsFromBody, validateAttachments } from "@/lib/attachments";
import { toUserFacingAnalysisError } from "@/lib/analysis-errors";
import { generateAnalysis } from "@/lib/generate-analysis";
import { resolveOriginalWorkItem } from "@/lib/work-item-text";
import { assertUiProviderSupported, logUsageSummary, summarizeLlmUsage } from "@/lib/llm";
import { parseAnalysisResponse } from "@/lib/parse-analysis";
import type { AnalyzeRequest, UiLlmProviderId } from "@/types/qa-analysis";
import {
  isWorkItemTypeSelection,
  type WorkItemTypeSelection,
} from "@/types/work-item";

export async function POST(request: Request) {
  let provider: UiLlmProviderId = "groq";

  try {
    let body: AnalyzeRequest;
    try {
      body = (await request.json()) as AnalyzeRequest;
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body. Send JSON with input, provider, and workItemType.",
        },
        { status: 400 }
      );
    }

    const originalWorkItem = resolveOriginalWorkItem(body.originalWorkItem, body.input);
    const providerRaw = (body.provider ?? "groq").toLowerCase();
    const workItemTypeRaw = (body.workItemType ?? "auto").toLowerCase();

    try {
      assertUiProviderSupported(providerRaw);
      provider = providerRaw;
    } catch (error) {
      return NextResponse.json(
        { error: toUserFacingAnalysisError(error) },
        { status: 400 }
      );
    }

    if (!isWorkItemTypeSelection(workItemTypeRaw)) {
      return NextResponse.json(
        {
          error:
            'Invalid workItemType. Use: auto, feature, bug, enhancement, or technical_change.',
        },
        { status: 400 }
      );
    }

    const workItemType: WorkItemTypeSelection = workItemTypeRaw;

    if (!originalWorkItem) {
      return NextResponse.json(
        { error: "Please enter a work item before analyzing." },
        { status: 400 }
      );
    }

    let attachments;
    try {
      attachments = parseAttachmentsFromBody(body.attachments);
      validateAttachments(attachments);
    } catch (error) {
      return NextResponse.json(
        { error: toUserFacingAnalysisError(error) },
        { status: 400 }
      );
    }

    const llmResult = await generateAnalysis(
      originalWorkItem,
      provider,
      workItemType,
      attachments
    );
    const analysis = parseAnalysisResponse(llmResult.content, workItemType);
    const usage = summarizeLlmUsage([llmResult], provider);
    logUsageSummary("analyze", usage);

    return NextResponse.json({ analysis, provider, usage, originalWorkItem });
  } catch (error) {
    console.error("Analyze API error:", error);
    const message = toUserFacingAnalysisError(error, provider);
    const status = /before analyzing|Invalid request|not supported|workItemType|attach|image|video|Groq does not|requires Gemini/i.test(
      message
    )
      ? 400
      : /invalid response|missing required/i.test(message)
        ? 502
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
