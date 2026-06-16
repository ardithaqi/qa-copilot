/** Low temperature for more consistent evaluator scores. */
export const EVALUATOR_TEMPERATURE = 0.1;

/** Number of parallel LLM evaluation passes; scores are aggregated. */
export const EVALUATION_RUN_COUNT = 2;

/** Points subtracted from median LLM quality per failed hard-check criterion. */
export const HARD_CHECK_PENALTY_PER_FAILURE = 7;
