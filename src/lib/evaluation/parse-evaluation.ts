import {
  COVERAGE_AREA_IDS,
  normalizeCoverageAreaId,
  type CoverageAreaGap,
  type CoverageAreaId,
} from "@/lib/evaluation/coverage-areas";
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

function parseCoverageAreaGaps(raw: unknown): CoverageAreaGap[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const byArea = new Map<CoverageAreaId, CoverageAreaGap>();

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const areaRaw =
      typeof record.area === "string" ? record.area : String(record.area ?? "");
    const note = firstString(record.note);
    const area = normalizeCoverageAreaId(areaRaw);
    if (!area || !note) {
      continue;
    }
    if (!byArea.has(area)) {
      byArea.set(area, { area, note });
    }
  }

  return COVERAGE_AREA_IDS.filter((id) => byArea.has(id)).map(
    (id) => byArea.get(id)!
  );
}

function legacyStringToAreaGap(
  note: string,
  fallbackArea: CoverageAreaId
): CoverageAreaGap | null {
  const trimmed = note.trim();
  if (!trimmed) {
    return null;
  }

  const colonIndex = trimmed.indexOf(":");
  if (colonIndex > 0) {
    const maybeArea = normalizeCoverageAreaId(trimmed.slice(0, colonIndex));
    if (maybeArea) {
      return {
        area: maybeArea,
        note: trimmed.slice(colonIndex + 1).trim() || trimmed,
      };
    }
  }

  const lower = trimmed.toLowerCase();
  let area = fallbackArea;
  if (/\bapi\b|backend/.test(lower)) {
    area = "api";
  } else if (/\bedge\b|duplicate|rapid|repeat/.test(lower)) {
    area = "edge";
  } else if (/\bvalid/.test(lower)) {
    area = "validation";
  } else if (/\bpersist|refresh|session/.test(lower)) {
    area = "persistence";
  } else if (/\bfail|error|network|timeout/.test(lower)) {
    area = "failure_handling";
  } else if (/\bregress/.test(lower)) {
    area = "regression";
  } else if (/\bpermission|auth/.test(lower)) {
    area = "permissions";
  }

  return { area, note: trimmed };
}

function mergeLegacyGaps(
  strings: string[],
  fallbackArea: CoverageAreaId
): CoverageAreaGap[] {
  const gaps: CoverageAreaGap[] = [];
  const seen = new Set<CoverageAreaId>();

  for (const text of strings) {
    const gap = legacyStringToAreaGap(text, fallbackArea);
    if (!gap || seen.has(gap.area)) {
      continue;
    }
    seen.add(gap.area);
    gaps.push(gap);
  }

  return gaps;
}

function pickCoverageAreaGaps(data: Record<string, unknown>): CoverageAreaGap[] {
  const structured = parseCoverageAreaGaps(data.coverageAreaGaps);
  if (structured.length > 0) {
    return structured;
  }

  const legacy: CoverageAreaGap[] = [
    ...mergeLegacyGaps(stringArray(data.missingHappyPathTC), "persistence"),
    ...mergeLegacyGaps(stringArray(data.missingNegativeTC), "validation"),
    ...mergeLegacyGaps(stringArray(data.missingEdgeTC), "edge"),
    ...mergeLegacyGaps(stringArray(data.missingApiValidations), "api"),
    ...mergeLegacyGaps(stringArray(data.missingScenarios), "persistence"),
    ...mergeLegacyGaps(stringArray(data.missingEdgeCases), "edge"),
  ];

  const byArea = new Map<CoverageAreaId, CoverageAreaGap>();
  for (const gap of legacy) {
    if (!byArea.has(gap.area)) {
      byArea.set(gap.area, gap);
    }
  }

  return [...byArea.values()];
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
    coverageAreaGaps: pickCoverageAreaGaps(data),
    accuracyIssues: stringArray(data.accuracyIssues),
    qualityIssues: stringArray(data.qualityIssues),
    strengths: stringArray(data.strengths),
    improvementSuggestions: stringArray(data.improvementSuggestions),
  };
}
