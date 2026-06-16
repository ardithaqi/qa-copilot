"use client";

import { useState } from "react";
import type { EvaluationResult } from "@/lib/evaluation/types";
import { buildCoverageBreakdown } from "@/lib/evaluation/coverage-breakdown";
import { buildEvaluationMarkdown, downloadTextFile } from "@/lib/export-reports";

interface EvaluationResultsProps {
  evaluation: EvaluationResult;
  originalWorkItem: string;
}

function scoreTone(percent: number): string {
  if (percent >= 80) {
    return "text-emerald-700 bg-emerald-50 border-emerald-200";
  }
  if (percent >= 50) {
    return "text-amber-800 bg-amber-50 border-amber-200";
  }
  return "text-red-700 bg-red-50 border-red-200";
}

function IssueList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">
        {title} ({items.length})
      </h3>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-md border border-red-200 bg-white px-3 py-2 font-medium text-red-800"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-emerald-700">None identified.</p>
      )}
    </div>
  );
}

function CoverageBreakdownPanel({
  evaluation,
}: {
  evaluation: EvaluationResult;
}) {
  const [open, setOpen] = useState(true);
  const groups = buildCoverageBreakdown(evaluation);
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-xs text-slate-500" aria-hidden>
          {open ? "▼" : "▶"}
        </span>
        <span className="text-sm font-semibold text-slate-900">Coverage breakdown</span>
      </button>
      {open ? (
        <div className="border-t border-slate-200 px-4 pb-4 pt-3">
          <p className="text-xs text-slate-500">
            These areas explain what influenced the Coverage score.
          </p>
          <div className="mt-3 space-y-4">
            {groups.map((group) => (
              <div key={group.title} className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-900">{group.title}</p>
                {group.covered.length > 0 ? (
                  <div className="mt-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Covered
                    </p>
                    <ul className="mt-1 space-y-1 text-sm text-slate-700">
                      {group.covered.map((item) => (
                        <li key={item} className="text-emerald-800">
                          ✓ {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {group.missing.length > 0 ? (
                  <div className={group.covered.length > 0 ? "mt-3" : "mt-2"}>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Missing
                    </p>
                    <ul className="mt-1 space-y-3 text-sm text-slate-700">
                      {group.missing.map((item) => (
                        <li key={item.label}>
                          <p className="font-medium text-red-800">✕ {item.label}</p>
                          <p className="mt-0.5 pl-4 text-xs leading-relaxed text-slate-600">
                            {item.note}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function EvaluationResults({
  evaluation,
  originalWorkItem,
}: EvaluationResultsProps) {
  function handleDownload() {
    const content = buildEvaluationMarkdown(originalWorkItem, evaluation);
    downloadTextFile("evaluation-report.md", content);
  }

  const { scores } = evaluation;
  const coverageAdjusted = evaluation.hardCheckPenalty > 0;

  return (
    <section className="rounded-lg border border-violet-200 bg-violet-50/50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">AI quality evaluation</h2>
          <p className="mt-1 text-xs text-slate-600">
            {scores.evaluationRuns} evaluation passes (median + average) with a fixed
            rubric and coverage breakdown.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div
            title="How much of the important testing surface was covered? Missing areas in the coverage breakdown may lower this score."
            className={`rounded-lg border px-4 py-2 text-center ${scoreTone(evaluation.coveragePercent)}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">Coverage</p>
            <p className="text-2xl font-bold tabular-nums">{evaluation.coveragePercent}%</p>
            <p className="text-xs tabular-nums">
              {coverageAdjusted ? (
                <>
                  Base score {evaluation.coverageBaseScore}% · Missing areas −
                  {evaluation.hardCheckPenalty}
                </>
              ) : (
                <>
                  avg {scores.coverageAverage}% · {scores.coverageMin}–{scores.coverageMax}
                </>
              )}
            </p>
          </div>
          <div
            title="Does the report stick to the ticket? Higher means fewer invented details or claims that aren’t supported by the requirement."
            className={`rounded-lg border px-4 py-2 text-center ${scoreTone(evaluation.accuracyScore)}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">Accuracy</p>
            <p className="text-2xl font-bold tabular-nums">
              {evaluation.accuracyScore}
            </p>
            <p className="text-xs tabular-nums">
              avg {evaluation.scores.accuracyAverage}% · {evaluation.scores.accuracyMin}–
              {evaluation.scores.accuracyMax}
            </p>
          </div>
          <div
            title="How useful and well-written is the report? Clarity, prioritization, and actionability — not missing coverage areas."
            className={`rounded-lg border px-4 py-2 text-center ${scoreTone(evaluation.qualityScore)}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">Quality</p>
            <p className="text-2xl font-bold tabular-nums">{evaluation.qualityScore}</p>
            <p className="text-xs tabular-nums">
              avg {scores.qualityAverage} · {scores.qualityMin}–{scores.qualityMax}
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="mt-2 rounded-md border border-current/20 bg-white/70 px-2 py-1 text-xs font-medium transition hover:bg-white"
            >
              Download report
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-700">{evaluation.summary}</p>

      <p className="mt-3 text-sm text-slate-700">
        <span className="font-medium text-slate-800">Work item: </span>
        {originalWorkItem}
      </p>

      <CoverageBreakdownPanel evaluation={evaluation} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <IssueList title="Accuracy issues" items={evaluation.accuracyIssues} />
        <IssueList title="Quality issues" items={evaluation.qualityIssues} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Strengths ({evaluation.strengths.length})
          </h3>
          {evaluation.strengths.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {evaluation.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">None noted.</p>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Improvement suggestions ({evaluation.improvementSuggestions.length})
          </h3>
          {evaluation.improvementSuggestions.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {evaluation.improvementSuggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">None noted.</p>
          )}
        </div>
      </div>
    </section>
  );
}
