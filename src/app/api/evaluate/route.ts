import { NextResponse } from "next/server";
import { parseAttachmentsFromBody, validateAttachments } from "@/lib/attachments";
import { toUserFacingAnalysisError } from "@/lib/analysis-errors";
import { evaluateWithLlm } from "@/lib/evaluation/llm-evaluator";
import type {
  EvaluateErrorResponse,
  EvaluateRequest,
  EvaluateSuccessResponse,
} from "@/lib/evaluation/types";
import { assertUiProviderSupported, logUsageSummary } from "@/lib/llm";
import type { UiLlmProviderId } from "@/lib/llm/types";
import type { QAAnalysis } from "@/types/qa-analysis";
import { resolveOriginalWorkItem } from "@/lib/work-item-text";

function isValidAnalysis(analysis: unknown): analysis is QAAnalysis {
  if (!analysis || typeof analysis !== "object") {
    return false;
  }

  const candidate = analysis as Partial<QAAnalysis>;
  return (
    typeof candidate.summary === "string" &&
    Array.isArray(candidate.manualTestCases) &&
    Array.isArray(candidate.apiTestSuggestions) &&
    candidate.risks !== null &&
    typeof candidate.risks === "object"
  );
}

export async function POST(request: Request) {
  let provider: UiLlmProviderId = "groq";

  try {
    let body: EvaluateRequest;
    try {
      body = (await request.json()) as EvaluateRequest;
    } catch {
      return NextResponse.json<EvaluateErrorResponse>(
        {
          error:
            "Invalid request body. Send JSON with analysis, originalWorkItem, and provider.",
        },
        { status: 400 }
      );
    }

    if (!isValidAnalysis(body.analysis)) {
      return NextResponse.json<EvaluateErrorResponse>(
        { error: "Invalid analysis object in request." },
        { status: 400 }
      );
    }

    const originalWorkItem = resolveOriginalWorkItem(
      body.originalWorkItem,
      body.requirement
    );
    if (!originalWorkItem) {
      return NextResponse.json<EvaluateErrorResponse>(
        { error: "Please provide the original work item text for evaluation." },
        { status: 400 }
      );
    }

    const providerRaw = (body.provider ?? "groq").toLowerCase();
    try {
      assertUiProviderSupported(providerRaw);
      provider = providerRaw;
    } catch (error) {
      return NextResponse.json<EvaluateErrorResponse>(
        { error: toUserFacingAnalysisError(error) },
        { status: 400 }
      );
    }

    let attachments;
    try {
      attachments = parseAttachmentsFromBody(body.attachments);
      validateAttachments(attachments);
    } catch (error) {
      return NextResponse.json<EvaluateErrorResponse>(
        { error: toUserFacingAnalysisError(error) },
        { status: 400 }
      );
    }

    const { evaluation, usage } = await evaluateWithLlm(
      originalWorkItem,
      body.analysis,
      provider,
      attachments
    );
    logUsageSummary("evaluate", usage);

    return NextResponse.json<EvaluateSuccessResponse>({
      evaluation,
      originalWorkItem,
      provider,
      usage,
    });
  } catch (error) {
    console.error("Evaluate API error:", error);
    const message = toUserFacingAnalysisError(error, provider);
    const status = /before analyzing|Invalid request|not supported|provide the original|attach|image|video|Groq does not|requires Gemini/i.test(
      message
    )
      ? 400
      : /invalid response|invalid JSON|not a JSON object/i.test(message)
        ? 502
        : 500;

    return NextResponse.json<EvaluateErrorResponse>({ error: message }, { status });
  }
}
