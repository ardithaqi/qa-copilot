import type { LlmUsageSummary } from "@/lib/llm/usage-types";
import {
  formatEstimatedCost,
  formatTokenCount,
  formatUsageSummaryLine,
} from "@/lib/llm/usage-cost";
import type { UiLlmProviderId } from "@/lib/llm/types";

const PROVIDER_LABELS: Record<UiLlmProviderId, string> = {
  groq: "Groq",
  openai: "OpenAI",
  gemini: "Gemini",
};

interface RunUsageBannerProps {
  usage: LlmUsageSummary;
}

export default function RunUsageBanner({ usage }: RunUsageBannerProps) {
  if (usage.llmCalls === 0) {
    return null;
  }

  const providerLabel = PROVIDER_LABELS[usage.provider] ?? usage.provider;

  return (
    <details className="group mb-4 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="text-slate-400 transition group-open:rotate-90"
        >
          ▸
        </span>
        <span className="font-medium text-slate-900">Usage</span>
        <span className="tabular-nums text-slate-600">
          · {formatUsageSummaryLine(usage)}
        </span>
        <span className="ml-auto text-xs text-slate-400 group-open:hidden">
          Show details
        </span>
      </summary>
      <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-700">Provider / model</dt>
            <dd>
              {providerLabel} · {usage.model}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Tokens</dt>
            <dd className="tabular-nums">
              {formatTokenCount(usage.inputTokens)} in ·{" "}
              {formatTokenCount(usage.outputTokens)} out ·{" "}
              {formatTokenCount(usage.totalTokens)} total
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Estimated cost</dt>
            <dd className="tabular-nums">
              {formatEstimatedCost(usage.estimatedCostUsd)} (list pricing)
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">LLM calls</dt>
            <dd className="tabular-nums">{usage.llmCalls}</dd>
          </div>
        </dl>
        <p className="mt-3 text-slate-500">
          Billed on your {providerLabel} account. Check your provider dashboard
          for actual charges.
        </p>
      </div>
    </details>
  );
}
