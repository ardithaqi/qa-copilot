import type { QAAnalysis } from "@/types/qa-analysis";
import { formatTestCaseCategory } from "@/types/qa-analysis";

export function serializeAnalysisForEvaluation(analysis: QAAnalysis): string {
  const sections: string[] = [];

  sections.push("## Summary", analysis.summary || "—", "");

  sections.push("## Business rules");
  if (analysis.businessRules.explicit.length > 0) {
    sections.push("Explicit:", ...analysis.businessRules.explicit.map((r) => `- ${r}`));
  }
  if (analysis.businessRules.implied.length > 0) {
    sections.push("Implied:", ...analysis.businessRules.implied.map((r) => `- ${r}`));
  }
  sections.push("");

  sections.push("## Missing or unclear information");
  sections.push(
    ...(analysis.missingOrUnclearInformation.length > 0
      ? analysis.missingOrUnclearInformation.map((item) => `- ${item}`)
      : ["- None listed"])
  );
  sections.push("");

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
  if (analysis.manualTestCases.length === 0) {
    sections.push("- None generated");
  } else {
    for (const [index, testCase] of analysis.manualTestCases.entries()) {
      sections.push(
        `${index + 1}. ${testCase.title}`,
        `   Type: ${formatTestCaseCategory(testCase.category)} · Priority: ${testCase.priority}`,
        `   Steps: ${testCase.steps.join(" → ") || "—"}`,
        `   Expected: ${testCase.expectedResult || "—"}`
      );
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

  sections.push("## API test suggestions");
  sections.push(
    ...(analysis.apiTestSuggestions.length > 0
      ? analysis.apiTestSuggestions.map((item) => `- ${item}`)
      : ["- None generated"])
  );
  sections.push("");

  sections.push("## Final QA notes", analysis.finalQaNotes || "—");

  return sections.join("\n");
}

export function collectAnalysisHaystack(analysis: QAAnalysis): string {
  return serializeAnalysisForEvaluation(analysis).toLowerCase();
}
