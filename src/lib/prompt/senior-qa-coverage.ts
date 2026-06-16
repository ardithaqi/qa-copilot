/**
 * Generic senior-QA coverage rules shared by the generator prompt.
 * No domain-specific examples (no particular screens, fields, or routes).
 */

export const COVERAGE_DRIVEN_PRINCIPLE = `
## Coverage-driven design (mandatory — not count-driven)

The goal is **meaningful coverage**, not maximizing test count.

- Do **not** target a fixed number of test cases. There is no quota.
- Simple tickets: fewer test cases are acceptable.
- **Save / persist / profile-update bugs are not simple** — use the mandatory minimum floor in SAVE_PERSIST_BUG_FLOOR (typically 6–8 distinct cases). Stopping at 3–4 cases is unacceptable for this bug class.
- Complex tickets: more test cases are expected.
- Stop when the requirement appears sufficiently covered. Do not add cases merely to fill categories or reach a number.

Before adding any test case, ask: "Does this add **unique** coverage value that is not already verified elsewhere?"
If not, omit it.
`;

export const SENIOR_QA_MINDSET = `
## Senior QA mindset (mandatory)

Think like a Senior QA Engineer designing a test plan — reason through the ticket, then write only what is needed.

Actively consider:
- user actions and system responses
- validation (explicit or implied)
- saved state, persistence, and data integrity
- permissions when relevant
- failure handling, recovery, and silent failures
- regression and integration impact
- automation value (what earns automation vs stays manual)

Do **not** automatically create a separate test case for every category above.
Only create a test case when it adds unique coverage value the other cases do not already provide.
`;

export const COVERAGE_DEDUP_RULES = `
## Avoid duplicate or overlapping test cases (mandatory)

Every manual test case must contribute **unique** coverage. Do not generate overlapping scenarios.

Bad (duplicate):
- Test 1: Save → refresh page → verify persistence
- Test 2: Refresh page → verify persistence

Good (consolidated):
- One test: Save → refresh → verify updated value persists

Additional tests should exist only when they verify a **meaningfully different** condition — e.g. persistence after re-login (not already covered by refresh), invalid input rejection, server failure, rapid submit.

Merge related checks when appropriate:
- Successful save + persistence after refresh can be one happy_path case.
- When the ticket reports silent failure or missing confirmation, extend the **happy path** expectedResult to include visible success confirmation (or appropriate error if save fails) — do not add a separate case only for feedback.
`;

export const BUG_COVERAGE_RULES = `
## Bug work items (mandatory)

- The **first** manual test case must **reproduce** the reported defect (category: reproduction).
- **Title** — name the defect symptom (e.g. "Reproduce: updated phone number not persisted after save").
- **Steps** — how to trigger the issue. When the ticket describes actual vs expected, add a step noting current buggy behavior (e.g. "Observe current behavior: the old value is still shown after save").
- **expectedResult** — correct behavior when fixed. Never state the defect as the expected outcome.
  - Bad expectedResult: "The old phone number remains unchanged." (this is the bug, not the fix)
  - Bad expectedResult: "The updated phone number should be saved successfully and displayed in the profile." (too generic — does not tie to the reported failure mode)
  - Good expectedResult: "After Save, the updated phone number is shown on the profile and remains correct after a page refresh." (observable, matches a persistence/save bug)

Reproduction expectedResult rules:
- Must describe **observable** pass/fail criteria — what a reviewer can verify on screen or in state.
- Must align with the **same failure dimension** as the title and ticket (e.g. if the bug is about persistence, expectedResult must mention persistence or post-save visibility — not vague "saved successfully").
- Use the ticket's actual vs expected when provided; do not invent exact message text or routes not in the ticket.
- Do not use generic phrases like "saved successfully", "works as expected", or "displayed in the profile" without stating the specific observable outcome under test.

After reproduction, add the **distinct** cases required by SAVE_PERSIST_BUG_FLOOR when the bug involves save/persist failure.
`;

export const SAVE_PERSIST_BUG_FLOOR = `
## Save / persist bugs — minimum essential coverage (mandatory floor)

When a bug describes failure to save, update, or persist data (value not sticking, profile not updating, silent save failure), include **at least** these distinct manual test cases. No duplicate refresh-only cases, but **do not stop at 3–4 total**.

1. **Reproduction** (first, category reproduction) — observable correct expectedResult tied to the defect (see bug rules).
2. **Happy path** — successful save with persistence verified after page refresh (one case; include refresh in steps). When the ticket reports silent failure, no confirmation, or no error shown after save, extend expectedResult to also require visible user feedback, e.g. persistence after refresh **and** a success confirmation is shown (or an appropriate error if save fails) — without inventing exact message text.
3. **Invalid input** negative — reject bad format with user-visible feedback.
4. **Empty / required field** negative — when the field is implied required.
5. **Server or API failure** negative — error handling when save round-trip fails (use TODO for unknown endpoints).
6. **Network or timeout failure** negative — distinct from server error when both add value; at least one failure-handling negative is mandatory.

Add when they add **unique** value (not duplicates of the above):
- Persistence after re-login or navigate away/back (session-bound data)
- Rapid repeat submit / double-click (edge) — when save/submit is involved
- Regression on adjacent profile fields

**apiTestSuggestions** — mandatory with TODO placeholders (include GET-after-write persistence verify when save implies server round-trip).

**automationCandidates** — at least **4** for non-trivial save/persist bugs:
- Reproduction or happy path with refresh (UI, High)
- Critical validation negative (UI or API, Medium)
- Failure handling with mocked API/network (Integration or API, Medium)
- API persistence verify or re-login persistence (API or UI, Medium/Low)
Mark exploratory compatibility checks manualOnly.

Target **6–8** manual test cases for this bug class — coverage-driven, not a blind quota, but the floor above is non-negotiable.
`;

export const TEST_CASE_CATEGORY_RULES = `
## Test case categories (mandatory — assign exactly one per case)

Use category values: happy_path | negative | edge | regression | reproduction | other.

**happy_path** — successful primary flow and positive outcomes:
- Successful save/update with data persisted and visible
- Confirmation message, toast, or success feedback after a successful operation (NOT negative)
- Valid input accepted and correct outcome shown

**negative** — failures, rejections, and error handling:
- Invalid format or invalid input rejected with clear feedback
- Empty or missing required field validation
- Server or API failure handling
- Network timeout or connectivity failure

**edge** — timing, concurrency, and unusual interaction patterns:
- Rapid repeat submit, double-click, duplicate action
- Concurrency, burst, ordering (async/messaging)
- NOT browser or OS compatibility (use regression or other)

**regression** — adjacent or pre-existing behavior that must not break:
- Related fields, controls, or flows on the same screen
- Browser, device, or compatibility checks when relevant

**reproduction** — first bug test case only (see bug rules).

**other** — checks that do not fit above.

Common mistakes:
- Do NOT put confirmation after successful save under negative.
- Do NOT put invalid format, server failure, or network failure under edge.
- Do NOT put browser compatibility under edge.
`;

export const PERSISTENCE_FLOW_RULES = `
## Save / update / submit / persist flows (when implied)

When the ticket implies saving, updating, submitting, assigning, moving, or persisting data, **consider** coverage for:
- successful operation and user feedback
- persistence after refresh, navigation, or re-login when session-bound
- invalid input and missing required input
- server/API failure, network failure, timeout handling
- duplicate actions (rapid submit, double-click)
- regression on related behavior

**Do not create a separate test case for every item** if coverage is already achieved elsewhere.
Generate only the unique scenarios that materially improve coverage.

Example: one happy_path case can cover save + refresh persistence. Add a separate case for re-login persistence only when session scope makes that distinct from refresh.
`;

export const ASYNC_MESSAGING_RULES = `
## Async / event-driven / messaging flows (when implied)

When the ticket describes queues, event buses, subscriptions, webhooks, or async processing, **consider** coverage for:
- publish/emit success and consume/process success with side effects
- idempotency or duplicate delivery
- processing failure, retry, DLQ, or poison-message behavior
- consumer/subscriber vs broker outages (distinct when both matter)
- invalid or malformed payload validation
- concurrency, burst, or ordering when relevant

Create separate test cases only when each addresses a **distinct** concern not already covered. Do not enumerate one case per bullet by default.
`;

export const AUTOMATION_COVERAGE_RULES = `
## Automation recommendations (mandatory — selective subset)

automationCandidates are a **subset** of manual test cases — not a mirror of the full list.

Do **not** automate every manual test case. Do **not** assume every scenario needs a Playwright test.
Typical pattern: fewer automation candidates than manual test cases (e.g. 10 manual cases → 3–5 automation candidates).

Choose automation based on:
- stability and repeatability
- regression value and business importance
- maintenance cost vs signal gained

**Prefer automation for:**
- core happy paths with persistence verification
- critical validation rules
- important failure handling that can be mocked
- duplicate-submit prevention when relevant
- high-risk regressions with clear assertions

**Avoid automation by default for:**
- exploratory scenarios
- compatibility or browser checks
- vague regression checks requiring manual judgment
- loosely defined behavior
- low-value edge cases

Mark manualOnly: true for cases that should stay manual; explain why in whyNotAutomate.

**Automation layers** — choose the best signal per scenario (do not default everything to UI):
- **UI** — visible user workflow, confirmation messages, save/update behavior
- **API** — payload validation, response validation, persistence via read-after-write
- **Integration** — UI with mocked backend, error handling, retries, timeouts
- **Unit** — validation logic, pure business rules (no Playwright skeleton)
- **E2E** — complete multi-step workflows spanning multiple systems

Only candidates with layer **UI**, **E2E**, or **Integration** and manualOnly=false belong in playwrightTestSkeletons.
API and Unit candidates must not generate Playwright tests — cover them in apiTestSuggestions or manual notes instead.
`;

export const API_SUGGESTION_RULES = `
## API test suggestions (mandatory when backend is implied)

When save, update, submit, or persist behavior implies a server round-trip, include apiTestSuggestions — even if endpoints are unknown.

Use TODO placeholders for unknown endpoints, methods, payloads, auth, and status codes. Never invent real URLs or field names.

Include suggestions for:
- Successful create/update with expected response shape (TODO if unknown)
- Validation error responses for invalid or missing input
- Server error handling (5xx) and client-visible outcome
- Idempotency or duplicate-submit behavior when relevant
- Persistence verification via read/get after write when applicable

Use ["N/A — no API/backend behavior described"] only when the ticket has no server-side implication at all.
`;

export const TEST_CASE_QUALITY_RULES = `
## Test case quality (mandatory)

- Each test case: clear preconditions, actionable steps, verifiable expectedResult describing **correct expected behavior**.
- **Unique coverage only** — no overlapping or duplicate scenarios (see dedup rules).
- Assign priority P0/P1/P2: reproduction and core happy path typically P0; important negatives P1; edge/regression P2 unless elevated.
- Follow category rules strictly.
`;
