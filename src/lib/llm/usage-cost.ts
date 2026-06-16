import type { LlmCallResult, LlmUsageSummary } from "@/lib/llm/usage-types";
import type { UiLlmProviderId } from "@/lib/llm/types";

/** USD per 1M tokens — approximate list pricing for cost estimates only. */
const MODEL_PRICING_PER_MILLION: Record<
  string,
  { input: number; output: number }
> = {
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
};

const PROVIDER_DEFAULT_PRICING: Record<
  UiLlmProviderId,
  { input: number; output: number }
> = {
  groq: { input: 0.59, output: 0.79 },
  openai: { input: 0.15, output: 0.6 },
  gemini: { input: 0.1, output: 0.4 },
};

function pricingForModel(
  provider: UiLlmProviderId,
  model: string
): { input: number; output: number } {
  const normalized = model.toLowerCase();
  for (const [key, pricing] of Object.entries(MODEL_PRICING_PER_MILLION)) {
    if (normalized.includes(key)) {
      return pricing;
    }
  }
  return PROVIDER_DEFAULT_PRICING[provider];
}

export function estimateCostUsd(
  provider: UiLlmProviderId,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const { input, output } = pricingForModel(provider, model);
  const cost =
    (inputTokens / 1_000_000) * input + (outputTokens / 1_000_000) * output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function summarizeLlmUsage(
  calls: LlmCallResult[],
  provider: UiLlmProviderId
): LlmUsageSummary {
  if (calls.length === 0) {
    return {
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      model: "—",
      provider,
      isEstimate: true,
    };
  }

  const inputTokens = calls.reduce((sum, call) => sum + call.usage.inputTokens, 0);
  const outputTokens = calls.reduce(
    (sum, call) => sum + call.usage.outputTokens,
    0
  );
  const model = calls[0].model;

  const estimatedCostUsd = calls.reduce(
    (sum, call) =>
      sum +
      estimateCostUsd(
        call.provider,
        call.model,
        call.usage.inputTokens,
        call.usage.outputTokens
      ),
    0
  );

  return {
    llmCalls: calls.length,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCostUsd,
    model,
    provider,
    isEstimate: true,
  };
}

export function mergeUsageSummaries(
  ...summaries: LlmUsageSummary[]
): LlmUsageSummary {
  const nonEmpty = summaries.filter((summary) => summary.llmCalls > 0);
  if (nonEmpty.length === 0) {
    return summaries[0] ?? {
      llmCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      model: "—",
      provider: "groq",
      isEstimate: true,
    };
  }

  const provider = nonEmpty[0].provider;
  const models = [...new Set(nonEmpty.map((summary) => summary.model))];

  return {
    llmCalls: nonEmpty.reduce((sum, summary) => sum + summary.llmCalls, 0),
    inputTokens: nonEmpty.reduce((sum, summary) => sum + summary.inputTokens, 0),
    outputTokens: nonEmpty.reduce((sum, summary) => sum + summary.outputTokens, 0),
    totalTokens: nonEmpty.reduce((sum, summary) => sum + summary.totalTokens, 0),
    estimatedCostUsd:
      Math.round(
        nonEmpty.reduce((sum, summary) => sum + summary.estimatedCostUsd, 0) *
          1_000_000
      ) / 1_000_000,
    model: models.length === 1 ? models[0] : models.join(", "),
    provider,
    isEstimate: true,
  };
}

export function formatTokenCount(tokens: number): string {
  return tokens.toLocaleString();
}

export function formatEstimatedCost(usd: number): string {
  if (usd === 0) {
    return "$0.00";
  }
  if (usd < 0.01) {
    return `< $0.01`;
  }
  return `$${usd.toFixed(2)}`;
}

export function formatUsageSummaryLine(usage: LlmUsageSummary): string {
  return `${usage.llmCalls} LLM call${usage.llmCalls === 1 ? "" : "s"} · ${formatTokenCount(usage.totalTokens)} tokens · est. ${formatEstimatedCost(usage.estimatedCostUsd)}`;
}

export function logUsageSummary(label: string, usage: LlmUsageSummary): void {
  console.info(
    `[QA Copilot] ${label}: ${formatUsageSummaryLine(usage)} | ${usage.provider}/${usage.model} | ${formatTokenCount(usage.inputTokens)} in / ${formatTokenCount(usage.outputTokens)} out`
  );
}
