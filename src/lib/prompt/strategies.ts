import type { WorkItemType } from "@/types/work-item";

const STRATEGIES: Record<WorkItemType, string> = {
  feature: `### Strategy: Feature
Focus on business rules, happy path, negative testing, edge cases, regression impact, and automation candidates.
Emphasize acceptance criteria, user-visible behavior, and data/state changes described in the input.

If the input describes async/event-driven workflows (event bus, message queue, subscriptions like RabbitMQ, webhooks, async processing, eventual consistency):
- Add explicit tests for temporary outage for the *consumer* being unavailable (not just broker/event bus outage) and how the system behaves while processing is delayed/failed.
- Separate "consumer unavailable" from "broker/event bus unavailable" when the broker/queue is mentioned.
- Add explicit tests for broker/event-bus being temporarily unavailable during registration/processing when such technology is mentioned (e.g. RabbitMQ/event bus).
- Add tests for publish/success and consume/success where the consume/success test explicitly asserts the required side effect (e.g. "creates a record in the target database").
- Add tests for duplicate delivery and idempotency (no duplicate records / no double side effects).
- Add tests for invalid or malformed messages/payloads with explicit required-field/schema validation when implied (title/expectedResult should mention "missing required fields" or "invalid schema").
- Add tests for retry behavior and failure handling (e.g. poison message / DLQ) when implied; otherwise keep TODO placeholders in steps, but the title/expectedResult must mention retry and/or DLQ/poison.
- Add at least one concurrency/burst or ordering/out-of-order edge case when the input implies multiple events or asynchronous sequencing.`,

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
