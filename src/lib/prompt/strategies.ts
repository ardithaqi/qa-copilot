import type { WorkItemType } from "@/types/work-item";

const STRATEGIES: Record<WorkItemType, string> = {
  feature: `### Strategy: Feature
Focus on business rules, happy path, negative testing, edge cases, regression impact, and automation candidates.
Emphasize acceptance criteria, user-visible behavior, and data/state changes described in the input.`,

  bug: `### Strategy: Bug
Focus on reproduction scenarios, possible root causes, affected areas, regression coverage, validation after fix, and automation to prevent recurrence.
Include steps to verify the defect exists (if still reproducible) and steps to confirm the fix.
Do not invent root causes; list unconfirmed causes in missingOrUnclearInformation instead.`,

  enhancement: `### Strategy: Enhancement
Focus on changed behavior, backward compatibility, user impact, regression areas, acceptance criteria, and automation candidates.
Compare implied "before vs after" only when stated in the input; otherwise note gaps in missingOrUnclearInformation.`,

  technical_change: `### Strategy: Technical Change
Focus on integration risks, API impact, authentication/session impact, data handling, security, performance, regression areas, and automation coverage.
Prioritize non-UI verification (contracts, migrations, config) when the input suggests backend or infrastructure changes.`,

  unknown: `### Strategy: Unknown type
Apply balanced QA coverage: summarize what is known, list gaps, and propose cautious test ideas without assuming a specific work item category.`,
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
