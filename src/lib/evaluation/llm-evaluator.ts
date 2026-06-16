import { aggregateEvaluationRuns } from "@/lib/evaluation/aggregate-evaluation";
import {
  EVALUATION_RUN_COUNT,
  EVALUATOR_TEMPERATURE,
} from "@/lib/evaluation/constants";
import {
  buildEvaluatorSystemPrompt,
  buildEvaluatorUserPrompt,
} from "@/lib/evaluation/evaluator-prompt";
import { parseEvaluationResponse } from "@/lib/evaluation/parse-evaluation";
import type { EvaluationResult, LlmEvaluationRun } from "@/lib/evaluation/types";
import { serializeAnalysisForEvaluation } from "@/lib/evaluation/serialize-analysis";
import { generateQaAnalysis, summarizeLlmUsage, type UiLlmProviderId } from "@/lib/llm";
import type { LlmCallResult, LlmUsageSummary } from "@/lib/llm/usage-types";
import type { QAAnalysis } from "@/types/qa-analysis";

export interface EvaluationWithUsage {
  evaluation: EvaluationResult;
  usage: LlmUsageSummary;
}

async function runSingleEvaluation(
  requirement: string,
  generatedOutput: string,
  provider: UiLlmProviderId
): Promise<{ run: LlmEvaluationRun; call: LlmCallResult }> {
  const call = await generateQaAnalysis(provider, {
    input: requirement,
    systemPrompt: buildEvaluatorSystemPrompt(),
    userPrompt: buildEvaluatorUserPrompt(requirement, generatedOutput),
    temperature: EVALUATOR_TEMPERATURE,
  });

  return {
    run: parseEvaluationResponse(call.content),
    call,
  };
}

export async function evaluateWithLlm(
  requirement: string,
  analysis: QAAnalysis,
  provider: UiLlmProviderId
): Promise<EvaluationWithUsage> {
  const generatedOutput = serializeAnalysisForEvaluation(analysis);

  const results = await Promise.all(
    Array.from({ length: EVALUATION_RUN_COUNT }, () =>
      runSingleEvaluation(requirement, generatedOutput, provider)
    )
  );

  const evaluation = aggregateEvaluationRuns(
    results.map((result) => result.run),
    requirement,
    analysis
  );
  const usage = summarizeLlmUsage(
    results.map((result) => result.call),
    provider
  );

  return { evaluation, usage };
}
