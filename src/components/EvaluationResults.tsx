import type { EvaluationResult, HardCheckResult } from "@/lib/evaluation/types";
import { EVALUATOR_TEMPERATURE } from "@/lib/evaluation/constants";
import { buildEvaluationMarkdown, downloadTextFile } from "@/lib/export-reports";

interface EvaluationResultsProps {
  evaluation: EvaluationResult;
  requirement: string;
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

function GapList({ title, items }: { title: string; items: string[] }) {
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

function HardCheckPanel({ hardChecks }: { hardChecks: HardCheckResult[] }) {
  if (hardChecks.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Hard checks (deterministic)</h3>
      <p className="mt-1 text-xs text-slate-500">
        Keyword checks on generated output for known requirement patterns. Failed
        criteria reduce the final quality score.
      </p>
      <div className="mt-3 space-y-3">
        {hardChecks.map((check) => (
          <div key={check.ruleId} className="rounded-md border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-900">
              {check.ruleLabel}{" "}
              <span
                className={
                  check.passed ? "text-emerald-700" : "text-red-700"
                }
              >
                {check.passed ? "· passed" : "· gaps found"}
              </span>
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {check.criteria.map((criterion) => (
                <li key={criterion.label}>
                  {criterion.passed ? "✓" : "✗"} {criterion.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EvaluationResults({
  evaluation,
  requirement,
}: EvaluationResultsProps) {
  function handleDownload() {
    const content = buildEvaluationMarkdown(requirement, evaluation);
    downloadTextFile("evaluation-report.md", content);
  }

  const { scores } = evaluation;
  const qualityAdjusted = evaluation.hardCheckPenalty > 0;

  return (
    <section className="rounded-lg border border-violet-200 bg-violet-50/50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">AI quality evaluation</h2>
          <p className="mt-1 text-xs text-slate-600">
            {scores.evaluationRuns} LLM passes (median + average) with fixed rubric,
            temperature {EVALUATOR_TEMPERATURE}, plus hard checks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div
            title="How complete is the report? Higher means fewer missing test scenarios, edge cases, API checks, or risks."
            className={`rounded-lg border px-4 py-2 text-center ${scoreTone(evaluation.coveragePercent)}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">Coverage</p>
            <p className="text-2xl font-bold tabular-nums">{evaluation.coveragePercent}%</p>
            <p className="text-xs tabular-nums">
              avg {scores.coverageAverage}% · {scores.coverageMin}–{scores.coverageMax}
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
            title="Overall grade for the report. Combines coverage, accuracy, and strengths. May be lowered when required checklist items are missing."
            className={`rounded-lg border px-4 py-2 text-center ${scoreTone(evaluation.qualityScore)}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">Quality</p>
            <p className="text-2xl font-bold tabular-nums">{evaluation.qualityScore}</p>
            <p className="text-xs tabular-nums">
              {qualityAdjusted ? (
                <>
                  LLM median {evaluation.llmQualityMedian} (−{evaluation.hardCheckPenalty})
                </>
              ) : (
                <>
                  avg {scores.qualityAverage} · {scores.qualityMin}–{scores.qualityMax}
                </>
              )}
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
        <span className="font-medium text-slate-800">Requirement: </span>
        {requirement}
      </p>

      <HardCheckPanel hardChecks={evaluation.hardChecks} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <GapList title="Missing scenarios" items={evaluation.missingScenarios} />
        <GapList title="Missing edge cases" items={evaluation.missingEdgeCases} />
        <GapList title="Missing API validations" items={evaluation.missingApiValidations} />
        <GapList title="Missing risks" items={evaluation.missingRisks} />
        <GapList title="Accuracy issues" items={evaluation.accuracyIssues} />
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
