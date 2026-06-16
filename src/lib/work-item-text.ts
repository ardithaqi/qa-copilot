const WORK_ITEM_START = "--- WORK ITEM START ---";
const WORK_ITEM_END = "--- WORK ITEM END ---";

function extractBetween(
  text: string,
  startMarker: string,
  endMarker: string
): string | null {
  const startIdx = text.indexOf(startMarker);
  const endIdx = text.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return null;
  }
  return text.slice(startIdx + startMarker.length, endIdx).trim();
}

/**
 * Returns only the user's work item/ticket text — never analyzer or evaluator prompts.
 * Strips accidental delimiters or pasted "analyze the following" wrappers.
 */
export function extractOriginalWorkItem(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }

  const delimited = extractBetween(trimmed, WORK_ITEM_START, WORK_ITEM_END);
  if (delimited) {
    return delimited;
  }

  const analyzeIdx = trimmed.toLowerCase().indexOf("analyze the following work item");
  if (analyzeIdx !== -1) {
    const afterAnalyze = trimmed.slice(analyzeIdx);
    const inner = extractBetween(afterAnalyze, WORK_ITEM_START, WORK_ITEM_END);
    if (inner) {
      return inner;
    }
  }

  return trimmed;
}

export function resolveOriginalWorkItem(
  ...candidates: (string | undefined | null)[]
): string {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) {
      return extractOriginalWorkItem(value);
    }
  }
  return "";
}
