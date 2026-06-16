import { resolvePlaywrightSkeleton } from "@/lib/playwright-skeleton";
import {
  groupTestCasesByCategory,
  hasApiTestSuggestions,
} from "@/lib/report-display";
import type { EvaluationResult } from "@/lib/evaluation/types";
import { COVERAGE_AREA_LABELS } from "@/lib/evaluation/coverage-areas";
import type { QAAnalysis, QATestCase } from "@/types/qa-analysis";
import { formatTestCaseCategory } from "@/types/qa-analysis";
import {
  DETECTED_TYPE_LABELS,
  WORK_ITEM_TYPE_LABELS,
} from "@/types/work-item";

function formatTestCase(tc: QATestCase, index: number): string {
  const lines = [
    `### ${index + 1}. ${tc.title}`,
    `- **Type:** ${formatTestCaseCategory(tc.category)}`,
    `- **Priority:** ${tc.priority}`,
    `- **Preconditions:** ${tc.preconditions || "—"}`,
    `- **Steps:**`,
    ...(tc.steps.length
      ? tc.steps.map((s, i) => `  ${i + 1}. ${s}`)
      : ["  —"]),
    `- **Expected result:** ${tc.expectedResult || "—"}`,
    "",
  ];
  return lines.join("\n");
}

function workItemSection(analysis: QAAnalysis): string {
  const { workItem } = analysis;
  const lines = [
    `## Work item type`,
    `- **Selected:** ${WORK_ITEM_TYPE_LABELS[workItem.selectedType]}`,
    `- **Effective type:** ${DETECTED_TYPE_LABELS[workItem.effectiveType]}`,
  ];
  if (workItem.selectedType === "auto" && workItem.detectedType) {
    lines.push(
      `- **Detected:** ${DETECTED_TYPE_LABELS[workItem.detectedType]}`,
      `- **Confidence:** ${workItem.confidence ?? "—"}`,
      `- **Reasoning:** ${workItem.reasoning || "—"}`
    );
  } else if (workItem.reasoning) {
    lines.push(`- **Notes:** ${workItem.reasoning}`);
  }
  return lines.join("\n");
}

function formatTestCasesBody(analysis: QAAnalysis): string[] {
  const groups = groupTestCasesByCategory(analysis.manualTestCases);
  if (groups.length === 0) {
    return ["_No test cases generated._"];
  }

  const lines: string[] = [];
  let index = 0;
  for (const group of groups) {
    lines.push(`### ${group.label}`, "");
    for (const testCase of group.cases) {
      lines.push(formatTestCase(testCase, index));
      index += 1;
    }
  }
  return lines;
}

export function buildQaReportMarkdown(analysis: QAAnalysis): string {
  const sections = [
    `# QA Test Design Report`,
    ``,
    workItemSection(analysis),
    ``,
    `## Risks`,
    `### Product`,
    ...analysis.risks.product.map((r) => `- ${r}`),
    `### Technical`,
    ...analysis.risks.technical.map((r) => `- ${r}`),
    `### Regression`,
    ...analysis.risks.regression.map((r) => `- ${r}`),
    `### Security / data`,
    ...analysis.risks.securityOrData.map((r) => `- ${r}`),
    ``,
    `## Test cases`,
    ...formatTestCasesBody(analysis),
    `## Automation recommendations`,
    ...analysis.automationCandidates.map(
      (c) =>
        `- **${c.scenario}** (${c.priority}, ${c.layer}) — Automate: ${c.whyAutomate || "—"}${c.whyNotAutomate ? ` | Not now: ${c.whyNotAutomate}` : ""}${c.manualOnly ? " [manual-only]" : ""}`
    ),
    ``,
  ];

  if (hasApiTestSuggestions(analysis.apiTestSuggestions)) {
    sections.push(
      `## API test suggestions`,
      ...analysis.apiTestSuggestions.map((s) => `- ${s}`),
      ``
    );
  }

  if (analysis.finalQaNotes?.trim()) {
    sections.push(`## Final QA notes`, analysis.finalQaNotes, ``);
  }

  sections.push(
    `## Playwright skeleton`,
    `See \`${getPlaywrightExportFilename(analysis)}\` export.`
  );

  return sections.join("\n");
}

export function buildTestCasesMarkdown(analysis: QAAnalysis): string {
  const header = `# Test cases\n\n${workItemSection(analysis)}\n\n`;
  const body = analysis.manualTestCases.length
    ? formatTestCasesBody(analysis).join("\n")
    : "_No test cases generated._\n";
  return header + body;
}

export function buildAutomationCandidatesMarkdown(
  analysis: QAAnalysis
): string {
  const lines = [
    `# Automation recommendations`,
    ``,
  ];

  if (!analysis.automationCandidates.length) {
    lines.push("_No automation candidates identified._");
    return lines.join("\n");
  }

  for (const c of analysis.automationCandidates) {
    lines.push(
      `## ${c.scenario}`,
      `- **Priority:** ${c.priority}`,
      `- **Layer:** ${c.layer}`,
      `- **Manual only:** ${c.manualOnly ? "Yes" : "No"}`,
      `- **Why automate:** ${c.whyAutomate || "—"}`,
      `- **Why not (yet):** ${c.whyNotAutomate || "—"}`,
      ``
    );
  }

  return lines.join("\n");
}

export function buildApiTestSuggestionsMarkdown(analysis: QAAnalysis): string {
  if (!hasApiTestSuggestions(analysis.apiTestSuggestions)) {
    return "# API test suggestions\n\n_No API/backend behavior described._\n";
  }

  return [
    `# API test suggestions`,
    ``,
    ...analysis.apiTestSuggestions.map((s) => `- ${s}`),
    ``,
  ].join("\n");
}

/** Kebab-case slug safe for download filenames. */
export function slugifyExportSlug(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return slug || "playwright";
}

const PLAYWRIGHT_DESCRIBE_RE =
  /test\.describe\s*\(\s*['"`]([^'"`]+)['"`]/;
const PLAYWRIGHT_TEST_RE = /test\s*\(\s*['"`]([^'"`]+)['"`]/;

/** Name reflects what the spec verifies, not the full ticket title. */
export function derivePlaywrightExportSlug(analysis: QAAnalysis): string {
  const uiLayers = new Set(["UI", "E2E"]);
  const automatable = analysis.automationCandidates.filter((c) => !c.manualOnly);

  const uiCandidate = automatable.find((c) => uiLayers.has(c.layer.toUpperCase()));
  if (uiCandidate?.scenario.trim()) {
    return slugifyExportSlug(uiCandidate.scenario);
  }

  if (automatable[0]?.scenario.trim()) {
    return slugifyExportSlug(automatable[0].scenario);
  }

  const skeleton = analysis.playwrightTestSkeletons ?? "";
  const testTitle = skeleton.match(PLAYWRIGHT_TEST_RE)?.[1];
  if (testTitle?.trim()) {
    return slugifyExportSlug(testTitle);
  }

  const describeTitle = skeleton.match(PLAYWRIGHT_DESCRIBE_RE)?.[1];
  if (describeTitle?.trim()) {
    return slugifyExportSlug(describeTitle);
  }

  const automatedCase = analysis.manualTestCases.find((tc) =>
    tc.automationSuitability.toLowerCase().startsWith("yes")
  );
  if (automatedCase?.title.trim()) {
    return slugifyExportSlug(automatedCase.title);
  }

  return "playwright";
}

export function getPlaywrightExportFilename(analysis: QAAnalysis): string {
  return `${derivePlaywrightExportSlug(analysis)}.spec.ts`;
}

function stripAssumptionsFromPlaywrightSkeleton(code: string): string {
  return code
    .split("\n")
    .filter((line) => !/\bASSUMPTION\b/i.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildPlaywrightSpec(analysis: QAAnalysis): string {
  const skeleton = stripAssumptionsFromPlaywrightSkeleton(
    resolvePlaywrightSkeleton(analysis)
  );
  return skeleton.trim() || "// No Playwright skeleton generated.\n";
}

export function buildEvaluationMarkdown(
  originalWorkItem: string,
  evaluation: EvaluationResult
): string {
  const listSection = (title: string, items: string[]) =>
  items.length > 0 ? [`## ${title}`, ...items.map((item) => `- ${item}`), ""] : [];

  const lines = [
    "# QA Copilot — AI Quality Evaluation",
    "",
    "## Work item",
    originalWorkItem,
    "",
    `- **Coverage (final):** ${evaluation.coveragePercent}%`,
    `- **Coverage (LLM median):** ${evaluation.llmCoverageMedian}%`,
    `- **Coverage (average):** ${evaluation.scores.coverageAverage}%`,
    `- **Coverage range:** ${evaluation.scores.coverageMin}–${evaluation.scores.coverageMax}`,
    `- **Accuracy (median):** ${evaluation.accuracyScore}%`,
    `- **Accuracy (average):** ${evaluation.scores.accuracyAverage}%`,
    `- **Accuracy range:** ${evaluation.scores.accuracyMin}–${evaluation.scores.accuracyMax}`,
    `- **Quality (final):** ${evaluation.qualityScore}`,
    `- **Quality (average):** ${evaluation.scores.qualityAverage}`,
    `- **Quality range:** ${evaluation.scores.qualityMin}–${evaluation.scores.qualityMax}`,
    `- **Evaluation runs:** ${evaluation.scores.evaluationRuns}`,
    `- **Hard-check coverage penalty:** ${evaluation.hardCheckPenalty}`,
    `- **Method:** ${evaluation.method}`,
    "",
    "## Summary",
    evaluation.summary,
    "",
  ];

  if (evaluation.hardChecks.length > 0) {
    lines.push("## Hard checks", "");
    for (const check of evaluation.hardChecks) {
      lines.push(`### ${check.ruleLabel} — ${check.passed ? "passed" : "gaps found"}`);
      for (const criterion of check.criteria) {
        lines.push(`- ${criterion.passed ? "[x]" : "[ ]"} ${criterion.label}`);
      }
      lines.push("");
    }
  }

  if (evaluation.coverageAreaGaps.length > 0) {
    lines.push("## Coverage area gaps", "");
    for (const gap of evaluation.coverageAreaGaps) {
      lines.push(`- **${COVERAGE_AREA_LABELS[gap.area]}**: ${gap.note}`);
    }
    lines.push("");
  }

  lines.push(
    ...listSection("Accuracy issues", evaluation.accuracyIssues),
    ...listSection("Quality issues", evaluation.qualityIssues),
    ...listSection("Strengths", evaluation.strengths),
    ...listSection("Improvement suggestions", evaluation.improvementSuggestions)
  );

  return lines.join("\n").trim() + "\n";
}

export type ExportFileId =
  | "qa-report"
  | "test-cases"
  | "automation-candidates"
  | "example-spec"
  | "api-test-suggestions";

export const EXPORT_FILES: {
  id: ExportFileId;
  filename: string;
  label: string;
}[] = [
  { id: "qa-report", filename: "qa-report.md", label: "QA report (.md)" },
  {
    id: "test-cases",
    filename: "test-cases.md",
    label: "Test cases (.md)",
  },
  {
    id: "automation-candidates",
    filename: "automation-candidates.md",
    label: "Automation recs (.md)",
  },
  {
    id: "example-spec",
    filename: "playwright.spec.ts",
    label: "Playwright (.ts)",
  },
  {
    id: "api-test-suggestions",
    filename: "api-test-suggestions.md",
    label: "API tests (.md)",
  },
];

export function getExportFilename(
  id: ExportFileId,
  analysis: QAAnalysis
): string {
  if (id === "example-spec") {
    return getPlaywrightExportFilename(analysis);
  }
  const meta = EXPORT_FILES.find((f) => f.id === id);
  return meta?.filename ?? "download.txt";
}

export function getExportContent(
  id: ExportFileId,
  analysis: QAAnalysis
): string {
  switch (id) {
    case "qa-report":
      return buildQaReportMarkdown(analysis);
    case "test-cases":
      return buildTestCasesMarkdown(analysis);
    case "automation-candidates":
      return buildAutomationCandidatesMarkdown(analysis);
    case "example-spec":
      return buildPlaywrightSpec(analysis);
    case "api-test-suggestions":
      return buildApiTestSuggestionsMarkdown(analysis);
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
