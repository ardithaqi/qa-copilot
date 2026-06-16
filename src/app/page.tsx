"use client";

import { useState } from "react";
import AnalysisResults from "@/components/AnalysisResults";
import { EVALUATION_RUN_COUNT } from "@/lib/evaluation/constants";
import RunUsageBanner from "@/components/RunUsageBanner";
import { mergeUsageSummaries } from "@/lib/llm";
import { UI_LLM_PROVIDERS, type UiLlmProviderId } from "@/lib/llm/types";
import type { LlmUsageSummary } from "@/lib/llm/usage-types";
import type {
  EvaluateErrorResponse,
  EvaluateSuccessResponse,
  EvaluationResult,
} from "@/lib/evaluation/types";
import type {
  AnalyzeErrorResponse,
  AnalyzeSuccessResponse,
  QAAnalysis,
} from "@/types/qa-analysis";
import {
  WORK_ITEM_TYPE_SELECTIONS,
  WORK_ITEM_TYPE_LABELS,
  type WorkItemTypeSelection,
} from "@/types/work-item";

const PROVIDER_LABELS: Record<UiLlmProviderId, string> = {
  groq: "Groq",
  openai: "OpenAI",
  gemini: "Gemini",
};

export default function Home() {
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<UiLlmProviderId>("groq");
  const [workItemType, setWorkItemType] =
    useState<WorkItemTypeSelection>("auto");
  const [analysis, setAnalysis] = useState<QAAnalysis | null>(null);
  const [resultProvider, setResultProvider] = useState<UiLlmProviderId | null>(
    null
  );
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [evaluationRequirement, setEvaluationRequirement] = useState<string | null>(
    null
  );
  const [runUsage, setRunUsage] = useState<LlmUsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"generate" | "evaluate" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleAnalyze(withEvaluation: boolean) {
    const trimmed = input.trim();
    setValidationError(null);
    setError(null);

    if (!trimmed) {
      setValidationError("Please paste a work item before analyzing.");
      return;
    }

    setLoading(true);
    setLoadingMode("generate");
    setAnalysis(null);
    setResultProvider(null);
    setEvaluation(null);
    setEvaluationRequirement(null);
    setRunUsage(null);

    try {
      let response: Response;
      try {
        response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: trimmed,
            provider,
            workItemType,
          }),
        });
      } catch {
        throw new Error(
          "Network error — could not reach the server. Check that npm run dev is running."
        );
      }

      let data: AnalyzeSuccessResponse | AnalyzeErrorResponse;
      try {
        data = (await response.json()) as
          | AnalyzeSuccessResponse
          | AnalyzeErrorResponse;
      } catch {
        throw new Error("Invalid response from server. Please try again.");
      }

      if (!response.ok) {
        const errorData = data as AnalyzeErrorResponse;
        throw new Error(errorData.error || "Failed to analyze requirements.");
      }

      const successData = data as AnalyzeSuccessResponse;
      if (!successData.analysis) {
        throw new Error("No analysis data returned. Please try again.");
      }

      setAnalysis(successData.analysis);
      setResultProvider(successData.provider ?? provider);
      setRunUsage(successData.usage);

      if (!withEvaluation) {
        return;
      }

      setLoadingMode("evaluate");
      const evalResponse = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: successData.analysis,
          requirement: trimmed,
          provider,
        }),
      });

      let evalData: EvaluateSuccessResponse | EvaluateErrorResponse;
      try {
        evalData = (await evalResponse.json()) as
          | EvaluateSuccessResponse
          | EvaluateErrorResponse;
      } catch {
        throw new Error("Invalid evaluation response from server.");
      }

      if (!evalResponse.ok) {
        const errorData = evalData as EvaluateErrorResponse;
        throw new Error(errorData.error || "Evaluation failed.");
      }

      const evalSuccess = evalData as EvaluateSuccessResponse;
      setEvaluation(evalSuccess.evaluation);
      setEvaluationRequirement(evalSuccess.requirement);
      setRunUsage(mergeUsageSummaries(successData.usage, evalSuccess.usage));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
      setLoadingMode(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          QA Copilot
        </h1>
        <p className="mt-2 text-slate-600">
          An AI-assisted QA platform that generates test strategies, risk assessments,
          automation candidates, and Playwright skeletons — optionally evaluated by a
          second LLM pass.
        </p>
      </header>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">
            Work item type
          </legend>
          <div className="flex flex-wrap gap-3">
            {WORK_ITEM_TYPE_SELECTIONS.map((id) => (
              <label
                key={id}
                className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"
              >
                <input
                  type="radio"
                  name="workItemType"
                  value={id}
                  checked={workItemType === id}
                  onChange={() => setWorkItemType(id)}
                  disabled={loading}
                  className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {WORK_ITEM_TYPE_LABELS[id]}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Auto-detect classifies the input; override when you already know the
            type.
          </p>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">
            AI provider
          </legend>
          <div className="flex flex-wrap gap-4">
            {UI_LLM_PROVIDERS.map((id) => (
              <label
                key={id}
                className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"
              >
                <input
                  type="radio"
                  name="provider"
                  value={id}
                  checked={provider === id}
                  onChange={() => setProvider(id)}
                  disabled={loading}
                  className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {PROVIDER_LABELS[id]}
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor="requirements" className="block text-sm font-medium text-slate-700">
          Work item / requirement input
        </label>
        <textarea
          id="requirements"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste ticket, bug report, user story, acceptance criteria, or technical change notes..."
          rows={14}
          className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          disabled={loading}
        />

        {(validationError || error) && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {validationError || error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleAnalyze(false)}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && loadingMode === "generate"
              ? "Generating report…"
              : "Analyze"}
          </button>
          <button
            type="button"
            onClick={() => handleAnalyze(true)}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && loadingMode === "evaluate"
              ? "Evaluating output…"
              : loading && loadingMode === "generate"
                ? "Generating report…"
                : "Analyze & evaluate"}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          <span className="font-medium text-slate-600">Analyze</span> — 1 LLM call
          (report only).{" "}
          <span className="font-medium text-slate-600">Analyze &amp; evaluate</span>{" "}
          — {1 + EVALUATION_RUN_COUNT} LLM calls (report + quality scores).
        </p>

        {loading && (
          <p className="text-sm text-slate-600">
            {loadingMode === "evaluate"
              ? `LLM judge: ${EVALUATION_RUN_COUNT} passes + hard checks (${PROVIDER_LABELS[provider]}).`
              : `Agent workflow: requirement analysis → rules → risks → test design → automation & API suggestions (${PROVIDER_LABELS[provider]}).`}
          </p>
        )}
      </div>

      {analysis && (
        <div className="mt-8">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold text-slate-900">Test design report</h2>
            {resultProvider && (
              <span className="text-sm text-slate-500">
                Generated with {PROVIDER_LABELS[resultProvider]}
              </span>
            )}
          </div>
          {runUsage ? <RunUsageBanner usage={runUsage} /> : null}
          <AnalysisResults
            analysis={analysis}
            evaluation={evaluation}
            evaluationRequirement={evaluationRequirement}
          />
        </div>
      )}
    </main>
  );
}
