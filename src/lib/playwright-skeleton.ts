import type { AutomationCandidate, QAAnalysis } from "@/types/qa-analysis";

const GENERIC_PATTERNS = [
  /TODO:\s*feature name/i,
  /TODO:\s*add scenario/i,
  /implement after confirming selectors and routes/i,
];

const PLAYWRIGHT_TEST_TITLE_RE = /test\s*\(\s*['"`]([^'"`]+)['"`]/g;

/** P0/P1/P2 map to High/Medium/Low for automation recommendations. */
export function normalizeAutomationPriority(priority: string): string {
  const key = priority.trim().toLowerCase();
  const map: Record<string, string> = {
    p0: "High",
    p1: "Medium",
    p2: "Low",
    high: "High",
    medium: "Medium",
    low: "Low",
    critical: "High",
  };
  return map[key] ?? priority.trim();
}

export function isHighAutomationPriority(priority: string): boolean {
  const normalized = normalizeAutomationPriority(priority);
  return normalized.toLowerCase() === "high";
}

export function isGenericPlaywrightSkeleton(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return true;

  const hasGenericMarker = GENERIC_PATTERNS.some((re) => re.test(trimmed));
  const meaningfulTests = extractPlaywrightTestTitles(trimmed).filter(
    (title) => !/TODO/i.test(title) && title.trim().length > 8
  );

  if (meaningfulTests.length === 0) return true;
  if (hasGenericMarker && meaningfulTests.length <= 1) return true;

  return false;
}

export function extractPlaywrightTestTitles(code: string): string[] {
  return [...code.matchAll(PLAYWRIGHT_TEST_TITLE_RE)].map((m) => m[1]);
}

/** Turn automation scenario text into a Playwright-style test title. */
export function scenarioToTestTitle(scenario: string): string {
  let text = scenario.trim();
  text = text.replace(/^verify\s+/i, "");
  text = text.replace(/^ensure\s+/i, "");
  text = text.replace(/^validate\s+/i, "");
  text = text.replace(/^check\s+(that\s+)?/i, "");

  const lower =
    text.charAt(0).toLowerCase() + text.slice(1).replace(/\s+/g, " ");
  if (/^should\s+/i.test(lower)) {
    return lower.replace(/^should\s+/i, "should ");
  }
  return `should ${lower}`;
}

function escapeTsString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function describeTitleFromAnalysis(analysis: QAAnalysis): string {
  const fromSummary = analysis.summary.trim().split("\n")[0]?.slice(0, 80);
  if (fromSummary) return fromSummary;
  const first = analysis.automationCandidates.find((c) => !c.manualOnly);
  return first?.scenario.slice(0, 80) || "Feature under test";
}

function buildTestBody(candidate: AutomationCandidate): string[] {
  const title = escapeTsString(scenarioToTestTitle(candidate.scenario));
  const layer = candidate.layer.toUpperCase();
  const lines = [`  test('${title}', async ({ page }) => {`];

  if (layer === "API") {
    lines.push(
      "    // TODO: use APIRequestContext or project API fixture",
      "    // TODO: confirm endpoint path, method, and auth from the ticket",
      `    // TODO: exercise scenario: ${candidate.scenario}`,
      "    // TODO: assert response status and payload"
    );
  } else {
    lines.push(
      "    // TODO: navigate to target screen (confirm route with team)",
      `    // TODO: perform steps for: ${candidate.scenario}`,
      "    // TODO: add locator(s) from the application under test",
      "    // TODO: assert expected outcome"
    );
  }

  lines.push("  });");
  return lines;
}

const PLAYWRIGHT_LAYERS = new Set(["ui", "e2e", "integration"]);

export function isPlaywrightEligibleCandidate(
  candidate: AutomationCandidate
): boolean {
  if (candidate.manualOnly) return false;
  const layer = candidate.layer.trim().toLowerCase();
  return PLAYWRIGHT_LAYERS.has(layer);
}

function playwrightEligibleCandidates(
  candidates: AutomationCandidate[]
): AutomationCandidate[] {
  return candidates.filter(isPlaywrightEligibleCandidate);
}

function sortCandidatesForSkeleton(
  candidates: AutomationCandidate[]
): AutomationCandidate[] {
  const rank = (p: string) => {
    const n = normalizeAutomationPriority(p).toLowerCase();
    if (n === "high") return 0;
    if (n === "medium") return 1;
    if (n === "low") return 2;
    return 3;
  };

  return [...candidates].sort(
    (a, b) => rank(a.priority) - rank(b.priority) || a.scenario.localeCompare(b.scenario)
  );
}

export function generatePlaywrightFromCandidates(
  analysis: QAAnalysis
): string {
  const candidates = sortCandidatesForSkeleton(
    playwrightEligibleCandidates(analysis.automationCandidates)
  );

  if (candidates.length === 0) {
    return `import { test, expect } from '@playwright/test';

// No UI/E2E automation candidates — add scenarios in Automation Recommendations first.
test.describe('${escapeTsString(describeTitleFromAnalysis(analysis))}', () => {
  test.skip('no automatable scenarios identified', async () => {});
});
`;
  }

  const describeTitle = escapeTsString(describeTitleFromAnalysis(analysis));
  const testBlocks = candidates.flatMap((c) => buildTestBody(c));

  return [
    "import { test, expect } from '@playwright/test';",
    "",
    `test.describe('${describeTitle}', () => {`,
    ...testBlocks,
    "});",
    "",
  ].join("\n");
}

function candidateCoveredInSkeleton(
  scenario: string,
  skeleton: string
): boolean {
  const skeletonLower = skeleton.toLowerCase();
  const title = scenarioToTestTitle(scenario).toLowerCase();
  if (skeletonLower.includes(title)) return true;

  const normalizeWord = (word: string): string => {
    const w = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    // Very light stemming to avoid obvious mismatches:
    // asynchronous vs asynchronously, synchronize vs synchronization, devices vs device.
    return w
      .replace(/(ization|isation|ation|tion|sion)$/, "")
      .replace(/(ingly|edly|ingly|edly|ingly|edly)$/, "")
      .replace(/(ingly|edly|ingly|edly|ly|ing|ed)$/, "")
      .replace(/s$/, "");
  };

  const words = scenario
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => normalizeWord(w))
    .filter((w) => w.length > 3);

  if (words.length === 0) return false;
  const unique = Array.from(new Set(words));
  const hits = unique.filter((w) => skeletonLower.includes(w)).length;
  // Two strong keyword hits is usually enough to avoid duplicate tests,
  // especially when scenario wording differs slightly from LLM titles.
  return hits >= Math.min(2, unique.length);
}

function appendTestsToSkeleton(
  skeleton: string,
  candidates: AutomationCandidate[],
  analysis: QAAnalysis
): string {
  const trimmed = skeleton.trim();
  const newTests = candidates.flatMap((c) => buildTestBody(c)).join("\n\n");

  const describeClose = trimmed.lastIndexOf("});");
  if (describeClose !== -1 && trimmed.includes("test.describe")) {
    const before = trimmed.slice(0, describeClose).trimEnd();
    const after = trimmed.slice(describeClose);
    return `${before}\n\n${newTests}\n${after}`;
  }

  return `${generatePlaywrightFromCandidates(analysis).trimEnd()}\n\n${newTests}\n`;
}

function ensurePlaywrightImport(code: string): string {
  if (code.includes("@playwright/test")) return code;
  return `import { test, expect } from '@playwright/test';\n\n${code}`;
}

/**
 * Prefer LLM skeleton when meaningful; otherwise build from eligible automation candidates.
 * Ensures every High-priority UI/E2E/Integration candidate has at least one test.
 */
export function resolvePlaywrightSkeleton(analysis: QAAnalysis): string {
  const raw = (analysis.playwrightTestSkeletons ?? "").trim();
  const automatable = playwrightEligibleCandidates(analysis.automationCandidates);

  if (automatable.length === 0) {
    if (raw && !isGenericPlaywrightSkeleton(raw)) {
      return ensurePlaywrightImport(raw);
    }
    return generatePlaywrightFromCandidates(analysis);
  }

  const highPriority = automatable.filter((c) =>
    isHighAutomationPriority(c.priority)
  );

  if (!raw || isGenericPlaywrightSkeleton(raw)) {
    return generatePlaywrightFromCandidates(analysis);
  }

  const missingHigh = highPriority.filter(
    (c) => !candidateCoveredInSkeleton(c.scenario, raw)
  );

  if (missingHigh.length > 0) {
    return ensurePlaywrightImport(
      appendTestsToSkeleton(raw, missingHigh, analysis)
    );
  }

  return ensurePlaywrightImport(raw);
}
