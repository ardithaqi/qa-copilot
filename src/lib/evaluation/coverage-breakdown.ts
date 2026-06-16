import type { CoverageAreaGap, CoverageAreaId } from "@/lib/evaluation/coverage-areas";
import type {
  CoverageBreakdownMissingItem,
  EvaluationResult,
} from "@/lib/evaluation/types";

export type { CoverageBreakdownMissingItem };

export interface CoverageBreakdownGroup {
  title: string;
  covered: string[];
  missing: CoverageBreakdownMissingItem[];
}

const AREA_SIGNALS: Record<CoverageAreaId, RegExp[]> = {
  validation: [/\bvalid/i, /\binvalid/i, /\brequired\b/i, /\binput\b/i],
  failure_handling: [/\bfail/i, /\berror/i, /\bnetwork/i, /\btimeout/i, /\boffline/i],
  api: [/\bapi\b/i, /\bbackend\b/i, /\bendpoint/i, /\bresponse/i, /\bserver\b/i],
  edge: [/\bedge/i, /\bduplicate/i, /\brapid/i, /\brepeat/i, /\bconcurr/i],
  permissions: [/\bpermission/i, /\baccess\b/i, /\bunauthor/i, /\bforbidden/i],
  regression: [/\bregress/i, /\badjacent\b/i, /\brelated\b/i],
  data_integrity: [/\bdata integrity/i, /\bcorrupt/i, /\bconsisten/i],
  persistence: [/\bpersist/i, /\brefresh/i, /\bsession/i, /\bstate\b/i],
  downstream_impact: [/\bdownstream/i, /\bside effect/i, /\bconsumer/i],
};

function dedupeCovered(labels: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const label of labels) {
    const key = label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(label);
  }
  return result;
}

function dedupeMissing(items: CoverageBreakdownMissingItem[]): CoverageBreakdownMissingItem[] {
  const seen = new Set<string>();
  const result: CoverageBreakdownMissingItem[] = [];
  for (const item of items) {
    const key = item.label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function formatThemeTitle(theme: string): string {
  const trimmed = theme.trim();
  if (!trimmed) {
    return "Feature coverage";
  }
  if (/\bcoverage$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} coverage`;
}

function oneSentence(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return trimmed;
  }
  const match = trimmed.match(/^(.+?[.!?])(?:\s|$)/);
  if (match) {
    return match[1];
  }
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}

function textSignalsArea(text: string, area: CoverageAreaId): boolean {
  const patterns = AREA_SIGNALS[area];
  return patterns.some((pattern) => pattern.test(text));
}

function gapRepresentedInBreakdown(
  gap: CoverageAreaGap,
  covered: string[],
  missing: CoverageBreakdownMissingItem[]
): boolean {
  const entries = [
    ...covered,
    ...missing.map((item) => `${item.label} ${item.note}`),
  ];

  return entries.some((text) => textSignalsArea(text, gap.area));
}

function labelFromGapNote(note: string): string {
  return note
    .replace(/\s+appears\s+(limited|weak|incomplete)\.?$/i, "")
    .replace(/\s+coverage$/i, "")
    .trim();
}

function gapToMissingItem(gap: CoverageAreaGap): CoverageBreakdownMissingItem {
  const note = oneSentence(gap.note);
  const label = labelFromGapNote(gap.note) || gap.area.replace(/_/g, " ");
  return { label, note };
}

function mergeAreaGapsIntoMissing(
  missing: CoverageBreakdownMissingItem[],
  covered: string[],
  gaps: CoverageAreaGap[]
): CoverageBreakdownMissingItem[] {
  const merged = [...missing];
  for (const gap of gaps) {
    if (gapRepresentedInBreakdown(gap, covered, merged)) {
      continue;
    }
    merged.push(gapToMissingItem(gap));
  }
  return merged;
}

export function buildCoverageBreakdown(
  evaluation: EvaluationResult
): CoverageBreakdownGroup[] {
  const { coverageTheme, coverageBreakdown, coverageAreaGaps } = evaluation;
  const covered = dedupeCovered(coverageBreakdown.covered);
  const missing = dedupeMissing(
    mergeAreaGapsIntoMissing(
      coverageBreakdown.missing.map((item) => ({
        label: item.label,
        note: item.note.trim() || `Coverage for ${item.label.toLowerCase()} appears limited.`,
      })),
      covered,
      coverageAreaGaps
    )
  );

  if (!coverageTheme && covered.length === 0 && missing.length === 0) {
    return [];
  }

  return [
    {
      title: formatThemeTitle(coverageTheme),
      covered,
      missing,
    },
  ];
}
