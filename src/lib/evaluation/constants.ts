/** Low temperature for more consistent evaluator scores. */
export const EVALUATOR_TEMPERATURE = 0.1;

/** Number of parallel LLM evaluation passes; scores are aggregated. */
export const EVALUATION_RUN_COUNT = 2;

/** Points subtracted from median LLM coverage per failed hard-check theme (criterion). */
export const HARD_CHECK_PENALTY_PER_FAILURE = 5;

/** Deterministic score rubric — applied server-side from structured findings. */
export const COVERAGE_GAP_PENALTY = 10;
export const ACCURACY_ISSUE_PENALTY = 12;
export const QUALITY_ISSUE_PENALTY = 8;
export const QUALITY_STRENGTH_BONUS_PER = 2;
export const QUALITY_STRENGTH_BONUS_CAP = 10;
