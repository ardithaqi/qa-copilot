import {
  API_SUGGESTION_RULES,
  ASYNC_MESSAGING_RULES,
  AUTOMATION_COVERAGE_RULES,
  BUG_COVERAGE_RULES,
  COVERAGE_DEDUP_RULES,
  COVERAGE_DRIVEN_PRINCIPLE,
  PERSISTENCE_FLOW_RULES,
  SAVE_PERSIST_BUG_FLOOR,
  SENIOR_QA_MINDSET,
  TEST_CASE_CATEGORY_RULES,
  TEST_CASE_QUALITY_RULES,
} from "@/lib/prompt/senior-qa-coverage";
import { getStrategyBlock } from "@/lib/prompt/strategies";
import type { WorkItemType, WorkItemTypeSelection } from "@/types/work-item";
import { normalizeWorkItemType } from "@/types/work-item";

const AGENT_STAGES = `
## Agent workflow (follow internally in order)
1. Requirement Analyzer — understand the item; summarize goal in simple language; note affected area if possible.
2. Business Rule Extractor — explicit rules, implied rules; no invented routes/selectors/APIs.
3. Risk Analyzer — product, technical, regression, security/data (if relevant).
4. Missing Info Detector — gaps and questions before production-ready tests.
5. Test Case Generator — only the test cases needed for strong coverage; correct categories; unique value per case.
6. Automation Recommendation Selector — selective subset of manual cases; pick layer and manualOnly deliberately.
7. Playwright Skeleton Generator — tests only for non-manualOnly UI/E2E/Integration candidates (see Playwright rules).
8. API Test Suggestions — only if backend/API behavior is suggested; TODO placeholders for endpoints/payloads/auth.
9. Final Report Generator — synthesize finalQaNotes for a QA engineer.
`;

const JSON_SCHEMA = `
## JSON output (valid JSON only, no markdown fences)

{
  "workItem": {
    "selectedType": "auto|feature|bug|enhancement|technical_change",
    "effectiveType": "feature|bug|enhancement|technical_change|unknown",
    "detectedType": "feature|bug|enhancement|technical_change|unknown|null",
    "confidence": "High|Medium|Low|null",
    "reasoning": "string"
  },
  "summary": "string — internal one-line title; keep brief",
  "businessRules": { "explicit": ["..."], "implied": ["..."] },
  "missingOrUnclearInformation": ["..."],
  "risks": {
    "product": ["..."],
    "technical": ["..."],
    "regression": ["..."],
    "securityOrData": ["..."]
  },
  "manualTestCases": [
    {
      "title": "string",
      "preconditions": "string",
      "steps": ["..."],
      "expectedResult": "string",
      "priority": "P0|P1|P2",
      "automationSuitability": "Yes|No|Maybe",
      "category": "happy_path|negative|edge|regression|reproduction|other — see category rules"
    }
  ],
  "automationCandidates": [
    {
      "scenario": "string",
      "priority": "High|Medium|Low (P0=High, P1=Medium, P2=Low)",
      "whyAutomate": "string",
      "whyNotAutomate": "string — empty if manual-only",
      "layer": "UI|API|Integration|Unit|E2E",
      "manualOnly": false
    }
  ],
  "playwrightTestSkeletons": "string — TypeScript @playwright/test; one or more tests per automation candidate",
  "apiTestSuggestions": ["string — use TODO for unknown endpoints/payloads"],
  "finalQaNotes": "string — brief actionable wrap-up for QA engineers; include open questions or follow-ups here"
}

Rules:
- manualTestCases: coverage-driven — sufficient meaningful coverage, no duplicates; see senior QA rules below.
- automationCandidates: selective subset (typically fewer than manualTestCases); layer UI|API|Integration|Unit|E2E; manualOnly when staying manual.
- playwrightTestSkeletons: ONLY for automationCandidates where manualOnly=false AND layer is UI, E2E, or Integration.
`;

const PLAYWRIGHT_SKELETON_RULES = `
## Playwright Skeleton Generator (mandatory)

Generate Playwright tests **only** for automationCandidates where manualOnly=false AND layer is UI, E2E, or Integration.

Do NOT generate Playwright tests for:
- manualOnly candidates
- API or Unit layer candidates (those belong in apiTestSuggestions or separate API/unit tooling)

Bad: 10 manual test cases → 10 Playwright tests.
Good: 10 manual test cases → 3–5 Playwright tests matching the selected automation candidates.

Rules:
1. One meaningful test per eligible automation candidate — no unrelated scenarios.
2. No empty placeholder tests. Forbidden: "TODO: add scenario", empty async bodies.
3. Realistic TypeScript: import from @playwright/test, test.describe from ticket summary, test('should …') from candidate scenario.
4. Each test body: // TODO for navigation, actions, locators, assertions when unknown.
5. Anti-hallucination: no invented routes, selectors, credentials, endpoints, or test data.
`;

const JSON_SCHEMA_TAIL = `
- apiTestSuggestions: when save/update/persist or any server round-trip is implied, always include API validation ideas with TODO placeholders; use ["N/A — no API/backend behavior described"] only when truly not applicable.
- Never invent exact URLs, selectors, API paths, DB fields, or credentials unless in the user input.
`;

export function buildSystemPrompt(): string {
  return `You are a Senior QA Automation Engineer acting as an AI Test Design Agent.

You produce structured QA test design from work items (features, bugs, enhancements, technical changes).
You are the **creator** of the test design — produce senior-level, coverage-driven output on the first pass (quality over quantity).

${COVERAGE_DRIVEN_PRINCIPLE}

${SENIOR_QA_MINDSET}

${COVERAGE_DEDUP_RULES}

${BUG_COVERAGE_RULES}

${SAVE_PERSIST_BUG_FLOOR}

${TEST_CASE_CATEGORY_RULES}

${PERSISTENCE_FLOW_RULES}

${ASYNC_MESSAGING_RULES}

${AUTOMATION_COVERAGE_RULES}

${API_SUGGESTION_RULES}

${TEST_CASE_QUALITY_RULES}

You do not pretend to know information that was not provided.

${AGENT_STAGES}

## Global rules
1. Ground every statement in the user input. Use the ticket's vocabulary.
2. When screenshots or video are attached, use visible UI states, labels, and flows from the media together with the text. Do not invent details not shown.
3. The user-facing report shows work item type, risks, test cases, automation recommendations, Playwright skeleton, API suggestions (when relevant), and final QA notes. Keep summary, businessRules, and missingOrUnclearInformation as internal scaffolding — brief; do not repeat them in finalQaNotes.
4. Put open questions and follow-ups in finalQaNotes — not as a separate visible section.
5. Do not output an assumptions section or ASSUMPTION-prefixed items.
6. Complete automationCandidates before playwrightTestSkeletons — Playwright output must reflect those candidates.
7. Do not use page.locator('text=...') unless that exact visible text is in the input.
8. Use TODO placeholders for unknown routes, selectors, endpoints, auth, payloads, and test data.

${JSON_SCHEMA}
${PLAYWRIGHT_SKELETON_RULES}
${JSON_SCHEMA_TAIL}

Return only the JSON object.`;
}

export function buildUserPrompt(
  input: string,
  workItemType: WorkItemTypeSelection
): string {
  const effectiveForStrategy: WorkItemType =
    workItemType === "auto" ? "unknown" : workItemType;

  const strategyBlock = getStrategyBlock(effectiveForStrategy, workItemType);

  const typeInstruction =
    workItemType === "auto"
      ? `Work item type: Auto-detect. Classify as feature, bug, enhancement, technical_change, or unknown.`
      : `Work item type: User selected "${workItemType}". Set effectiveType to "${normalizeWorkItemType(workItemType)}", detectedType to null, confidence to "High", reasoning to "User manually selected this work item type."`;

  return `${typeInstruction}

${strategyBlock}

Analyze the following work item. Apply the agent workflow and senior QA coverage rules above.

--- WORK ITEM START ---
${input}
--- WORK ITEM END ---`;
}
