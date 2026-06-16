import type { LlmEvaluationRun } from "@/lib/evaluation/types";

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(num)));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function firstString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function parseEvaluationResponse(raw: string): LlmEvaluationRun {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "EVALUATION_PARSE_ERROR: The evaluator returned invalid JSON. Please try again."
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      "EVALUATION_PARSE_ERROR: The evaluator response was not a JSON object."
    );
  }

  const data = parsed as Record<string, unknown>;

  return {
    coveragePercent: clampScore(data.coveragePercent),
    accuracyScore:
      data.accuracyScore === undefined ? 100 : clampScore(data.accuracyScore),
    qualityScore: clampScore(data.qualityScore),
    summary: firstString(data.summary, "No summary provided."),
    missingScenarios: stringArray(data.missingScenarios),
    missingEdgeCases: stringArray(data.missingEdgeCases),
    missingApiValidations: stringArray(data.missingApiValidations),
    missingRisks: stringArray(data.missingRisks),
    accuracyIssues: stringArray(data.accuracyIssues),
    strengths: stringArray(data.strengths),
    improvementSuggestions: stringArray(data.improvementSuggestions),
  };
}
