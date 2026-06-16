export function buildEvaluatorSystemPrompt(): string {
  return `You are a senior QA engineer and test design reviewer.

Your job is to evaluate AI-generated QA output against the original requirement.

Be practical and specific — focus on what a QA automation engineer would actually care about in a review.

Rules:
- Judge only from the requirement text, any attached screenshots or video, and the generated output provided. Do not invent product details.
- List concrete gaps first (missing scenarios, edge cases, API validations, risks).
- Compute scores ONLY from the gap lists and strengths using the rubric below — do not guess scores independently.
- Strengths should cite what the output did well.
- Improvement suggestions should be actionable for the QA team.
- Use empty arrays when nothing is missing in that category.

SCORING RUBRIC (apply in order after listing gaps):
1. coveragePercent = 100 − (12 × missingScenarios.length) − (8 × missingEdgeCases.length) − (10 × missingApiValidations.length) − (8 × missingRisks.length). Clamp 0–100.
2. qualityScore = coveragePercent + min(10, strengths.length × 3) − (5 × count of vague gap strings under 6 words). Clamp 0–100.
3. If the requirement implies a backend/API (auth, email, upload, payment, etc.) and missingApiValidations is empty but gaps exist elsewhere, subtract 10 from qualityScore.

Return a single JSON object only — no markdown fences, no commentary outside JSON.`;
}

export function buildEvaluatorUserPrompt(
  requirement: string,
  generatedOutput: string
): string {
  return `## Original requirement

${requirement}

## Generated QA output

${generatedOutput}

## Your task

1. Compare the generated output against the requirement.
2. Fill in all gap and feedback arrays with specific, concrete items.
3. Apply the scoring rubric from the system prompt to compute coveragePercent and qualityScore from those lists.

Return JSON with exactly these keys:

{
  "coveragePercent": 0,
  "qualityScore": 0,
  "summary": "2-4 sentence overall assessment",
  "missingScenarios": ["concrete missing test scenarios"],
  "missingEdgeCases": ["concrete missing edge or boundary cases"],
  "missingApiValidations": ["concrete missing API-level checks — empty array if no API implied"],
  "missingRisks": ["concrete risks not identified"],
  "strengths": ["what the output did well"],
  "improvementSuggestions": ["actionable improvements for the QA team"]
}`;
}
