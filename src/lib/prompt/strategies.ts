import type { WorkItemType } from "@/types/work-item";

const STRATEGIES: Record<WorkItemType, string> = {
  feature: `### Strategy: Feature
Coverage-driven: generate only test cases that add unique value. Simple features need fewer cases; complex features need more. No fixed quota.
Emphasize acceptance criteria, user-visible behavior, and data/state changes from the input.
Assign categories correctly. Merge overlapping checks (e.g. save + refresh persistence in one case).
automationCandidates: selective subset — not every manual case. Prefer UI/E2E for workflows, API for backend validation.
apiTestSuggestions when persistence or server round-trips are implied.`,

  bug: `### Strategy: Bug
Apply SAVE_PERSIST_BUG_FLOOR when the bug involves save/update/persist failure — minimum 6–8 distinct manual cases, not 3–4.
First case MUST reproduce (reproduction). expectedResult = observable correct behavior; bug observation in steps.
Include: happy path + refresh, invalid input, empty required, server/API failure, network/timeout failure, apiTestSuggestions.
When ticket reports silent failure or missing confirmation: extend happy path expectedResult to include visible success confirmation or appropriate error — do not add a separate feedback-only case.
automationCandidates: minimum 4 for save/persist bugs (UI happy/repro, validation, mocked failure, API or session persistence).
Avoid duplicate refresh-only cases. Do not invent root causes.`,

  enhancement: `### Strategy: Enhancement
Coverage-driven: focus on changed behavior, compatibility, user impact, and regression.
Compare "before vs after" only when stated; otherwise note gaps in missingOrUnclearInformation.
Merge overlapping persistence checks. Selective automation subset.`,

  technical_change: `### Strategy: Technical Change
Coverage-driven: integration risks, API impact, auth/session, data handling, security, performance.
Prioritize API/Integration/Unit layers when backend or infrastructure changes dominate.
Selective automation — not every scenario needs Playwright.`,

  unknown: `### Strategy: Unknown type
Balanced senior QA coverage: reproduction or happy path as appropriate, negatives, edge, regression as needed.
Coverage-driven — stop when sufficiently covered. Do not assume a work item category without evidence.`,
};

export function getStrategyForType(type: WorkItemType): string {
  return STRATEGIES[type];
}

export function getStrategyBlock(
  effectiveType: WorkItemType,
  userSelected: "auto" | WorkItemType
): string {
  if (userSelected !== "auto") {
    return `${STRATEGIES[effectiveType]}

The user manually selected type: ${userSelected}. Use this type for your analysis strategy. Set workItem.detectedType to null, confidence to "High", and reasoning to a brief note that the user override was applied.`;
  }
  return `${STRATEGIES[effectiveType]}

The user selected Auto-detect. Classify the input, set workItem.detectedType, confidence (High/Medium/Low), and reasoning.`;
}
