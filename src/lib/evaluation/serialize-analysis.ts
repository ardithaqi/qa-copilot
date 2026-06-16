import { groupTestCasesByCategory, hasApiTestSuggestions } from "@/lib/report-display";
import type { QAAnalysis } from "@/types/qa-analysis";
import { formatTestCaseCategory } from "@/types/qa-analysis";

export function serializeAnalysisForEvaluation(analysis: QAAnalysis): string {
  const sections: string[] = [];

  sections.push("## Risks");
  const riskGroups = [
    ["Product", analysis.risks.product],
    ["Technical", analysis.risks.technical],
    ["Regression", analysis.risks.regression],
    ["Security / data", analysis.risks.securityOrData],
  ] as const;
  for (const [label, items] of riskGroups) {
    if (items.length > 0) {
      sections.push(`${label}:`, ...items.map((item) => `- ${item}`));
    }
  }
  sections.push("");

  sections.push("## Test cases");
  const groups = groupTestCasesByCategory(analysis.manualTestCases);
  if (groups.length === 0) {
    sections.push("- None generated");
  } else {
    let index = 0;
    for (const group of groups) {
      sections.push(`### ${group.label}`);
      for (const testCase of group.cases) {
        index += 1;
        sections.push(
          `${index}. ${testCase.title}`,
          `   Type: ${formatTestCaseCategory(testCase.category)} · Priority: ${testCase.priority}`,
          `   Steps: ${testCase.steps.join(" → ") || "—"}`,
          `   Expected: ${testCase.expectedResult || "—"}`
        );
      }
    }
  }
  sections.push("");

  sections.push("## Automation recommendations");
  if (analysis.automationCandidates.length === 0) {
    sections.push("- None generated");
  } else {
    for (const candidate of analysis.automationCandidates) {
      sections.push(
        `- ${candidate.scenario} (${candidate.priority}, ${candidate.layer})`
      );
    }
  }
  sections.push("");

  if (hasApiTestSuggestions(analysis.apiTestSuggestions)) {
    sections.push("## API test suggestions");
    sections.push(...analysis.apiTestSuggestions.map((item) => `- ${item}`));
    sections.push("");
  }

  if (analysis.finalQaNotes?.trim()) {
    sections.push("## Final QA notes", analysis.finalQaNotes);
  }

  return sections.join("\n");
}

export function collectAnalysisHaystack(analysis: QAAnalysis): string {
  return serializeAnalysisForEvaluation(analysis).toLowerCase();
}
