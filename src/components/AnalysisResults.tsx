import ExportDownloads from "@/components/ExportDownloads";
import { buildPlaywrightSpec } from "@/lib/export-reports";
import type { AutomationCandidate, QAAnalysis, QATestCase } from "@/types/qa-analysis";
import { formatTestCaseCategory } from "@/types/qa-analysis";
import {
  DETECTED_TYPE_LABELS,
  WORK_ITEM_TYPE_LABELS,
} from "@/types/work-item";

interface AnalysisResultsProps {
  analysis: QAAnalysis;
}

function Section({
  title,
  variant = "default",
  children,
}: {
  title: string;
  variant?: "default" | "highlight" | "warning" | "info";
  children: React.ReactNode;
}) {
  const variantClasses = {
    default: "border-slate-200 bg-white",
    highlight: "border-amber-200 bg-amber-50/60",
    warning: "border-orange-200 bg-orange-50/60",
    info: "border-blue-200 bg-blue-50/60",
  };

  return (
    <section
      className={`rounded-lg border p-5 shadow-sm ${variantClasses[variant]}`}
    >
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">None identified.</p>;
  }
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 32)}`}>{item}</li>
      ))}
    </ul>
  );
}

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

function TestCaseCard({ testCase, index }: { testCase: QATestCase; index: number }) {
  return (
    <article className="rounded-md border border-slate-200 bg-slate-50/80 p-4">
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

function AutomationCard({ candidate }: { candidate: AutomationCandidate }) {
  return (
    <article className="rounded-md border border-slate-200 bg-slate-50/80 p-4 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <TestCaseMeta label="Priority" value={candidate.priority} />
        <TestCaseMeta label="Layer" value={candidate.layer} />
        {candidate.manualOnly ? (
          <TestCaseMeta label="Run" value="Keep manual" />
        ) : null}
      </div>
      <h3 className="mt-2 font-semibold text-slate-900">{candidate.scenario}</h3>
      {candidate.whyAutomate ? (
        <p className="mt-2">
          <span className="font-medium text-slate-700">Why automate: </span>
          {candidate.whyAutomate}
        </p>
      ) : null}
      {candidate.whyNotAutomate ? (
        <p className="mt-1">
          <span className="font-medium text-slate-700">Why not yet: </span>
          {candidate.whyNotAutomate}
        </p>
      ) : null}
    </article>
  );
}

function WorkItemTypeSection({ analysis }: { analysis: QAAnalysis }) {
  const { workItem } = analysis;
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="font-medium text-slate-500">Selected</dt>
        <dd className="text-slate-900">{WORK_ITEM_TYPE_LABELS[workItem.selectedType]}</dd>
      </div>
      <div>
        <dt className="font-medium text-slate-500">Effective type</dt>
        <dd className="text-slate-900">
          {DETECTED_TYPE_LABELS[workItem.effectiveType]}
        </dd>
      </div>
      {workItem.selectedType === "auto" && workItem.detectedType ? (
        <div>
          <dt className="font-medium text-slate-500">Detected</dt>
          <dd className="text-slate-900">
            {DETECTED_TYPE_LABELS[workItem.detectedType]}
          </dd>
        </div>
      ) : null}
      {workItem.confidence ? (
        <div>
          <dt className="font-medium text-slate-500">Confidence</dt>
          <dd className="text-slate-900">{workItem.confidence}</dd>
        </div>
      ) : null}
      {workItem.reasoning ? (
        <div className="sm:col-span-2">
          <dt className="font-medium text-slate-500">Reasoning</dt>
          <dd className="text-slate-700">{workItem.reasoning}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export default function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const hasRisks =
    analysis.risks.product.length > 0 ||
    analysis.risks.technical.length > 0 ||
    analysis.risks.regression.length > 0 ||
    analysis.risks.securityOrData.length > 0;

  return (
    <div className="space-y-5">
      <ExportDownloads analysis={analysis} />

      <Section title="1. Work Item Type" variant="info">
        <WorkItemTypeSection analysis={analysis} />
      </Section>

      <Section title="2. Feature / Bug / Change Summary">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {analysis.summary || "No summary provided."}
        </p>
      </Section>

      <Section title="3. Business Rules">
        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Explicit</p>
        <BulletList items={analysis.businessRules.explicit} />
        <p className="mb-2 mt-4 text-xs font-semibold uppercase text-slate-500">Implied</p>
        <BulletList items={analysis.businessRules.implied} />
      </Section>

      <Section title="4. Missing or Unclear Information" variant="warning">
        <BulletList items={analysis.missingOrUnclearInformation} />
      </Section>

      <Section title="5. Risks">
        {hasRisks ? (
          <div className="space-y-4 text-sm">
            {analysis.risks.product.length > 0 ? (
              <div>
                <p className="font-semibold text-slate-800">Product</p>
                <BulletList items={analysis.risks.product} />
              </div>
            ) : null}
            {analysis.risks.technical.length > 0 ? (
              <div>
                <p className="font-semibold text-slate-800">Technical</p>
                <BulletList items={analysis.risks.technical} />
              </div>
            ) : null}
            {analysis.risks.regression.length > 0 ? (
              <div>
                <p className="font-semibold text-slate-800">Regression</p>
                <BulletList items={analysis.risks.regression} />
              </div>
            ) : null}
            {analysis.risks.securityOrData.length > 0 ? (
              <div>
                <p className="font-semibold text-slate-800">Security / data</p>
                <BulletList items={analysis.risks.securityOrData} />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">None identified.</p>
        )}
      </Section>

      <Section title="6. Test Cases">
        <p className="mb-3 text-xs text-slate-500">
          Scenarios to verify the work item — each tagged with type (happy path,
          negative, edge, etc.) and priority. Automation decisions are in the next
          section.
        </p>
        {analysis.manualTestCases.length > 0 ? (
          <div className="space-y-4">
            {analysis.manualTestCases.map((tc, index) => (
              <TestCaseCard key={`${index}-${tc.title}`} testCase={tc} index={index} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">None identified.</p>
        )}
      </Section>

      <Section title="7. Automation Recommendations">
        <p className="mb-3 text-xs text-slate-500">
          Which scenarios to automate (and at what layer), what to keep manual for
          now, and why.
        </p>
        {analysis.automationCandidates.length > 0 ? (
          <div className="space-y-3">
            {analysis.automationCandidates.map((c) => (
              <AutomationCard key={c.scenario.slice(0, 48)} candidate={c} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">None identified.</p>
        )}
      </Section>

      <Section title="8. Playwright Skeletons">
        <p className="mb-3 text-xs text-slate-500">
          Skeleton only — confirm routes, selectors, and auth with your team.
        </p>
        <pre className="overflow-x-auto rounded-md bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
          <code>{buildPlaywrightSpec(analysis)}</code>
        </pre>
      </Section>

      <Section title="9. API Test Suggestions">
        <BulletList items={analysis.apiTestSuggestions} />
      </Section>

      <Section title="10. Final QA Notes">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {analysis.finalQaNotes || "No final notes provided."}
        </p>
      </Section>
    </div>
  );
}
