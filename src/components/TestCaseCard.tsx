"use client";

import CopyButton from "@/components/CopyButton";
import { formatTestCaseAsMarkdown } from "@/lib/export-reports";
import type { QATestCase } from "@/types/qa-analysis";
import { formatTestCaseCategory } from "@/types/qa-analysis";

function TestCaseMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="text-xs">
      <span className="font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="ml-1.5 font-medium text-slate-800">{value}</span>
    </div>
  );
}

export default function TestCaseCard({
  testCase,
  index,
}: {
  testCase: QATestCase;
  index: number;
}) {
  const copyText = formatTestCaseAsMarkdown(testCase, index);

  return (
    <article className="rounded-md border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-xs font-medium tabular-nums text-slate-500">
            #{String(index + 1).padStart(2, "0")}
          </span>
          <TestCaseMeta
            label="Type"
            value={formatTestCaseCategory(testCase.category)}
          />
          <TestCaseMeta label="Priority" value={testCase.priority} />
        </div>
        <CopyButton text={copyText} label="Copy" />
      </div>
      <h3 className="mt-2 text-base font-semibold text-slate-900">{testCase.title}</h3>
      {testCase.preconditions ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Preconditions</p>
          <p className="mt-1 text-sm text-slate-700">{testCase.preconditions}</p>
        </div>
      ) : null}
      {testCase.steps.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Steps</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {testCase.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
      {testCase.expectedResult ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Expected result</p>
          <p className="mt-1 text-sm text-slate-700">{testCase.expectedResult}</p>
        </div>
      ) : null}
    </article>
  );
}
