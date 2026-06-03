import { NextResponse } from "next/server";
import { toUserFacingAnalysisError } from "@/lib/analysis-errors";
import { generateAnalysisJson } from "@/lib/generate-analysis";
import { assertUiProviderSupported } from "@/lib/llm";
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

    const input = body.input?.trim();
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

    if (!input) {
      return NextResponse.json(
        { error: "Please enter feature requirements before analyzing." },
        { status: 400 }
      );
    }

    const content = await generateAnalysisJson(input, provider, workItemType);
    const analysis = parseAnalysisResponse(content, workItemType);
    return NextResponse.json({ analysis, provider });
  } catch (error) {
    console.error("Analyze API error:", error);
    const message = toUserFacingAnalysisError(error, provider);
    const status = /before analyzing|Invalid request|not supported|workItemType/i.test(
      message
    )
      ? 400
      : /invalid response|missing required/i.test(message)
        ? 502
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
