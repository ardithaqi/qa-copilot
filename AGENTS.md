# QA Copilot — Agent & handoff context

> **For AI agents and new chat sessions:** Read this file first. It describes the real codebase as of the last update below.  
> **For humans:** Paste into a new Cursor chat: *“Read `AGENTS.md` in this workspace and continue from there.”*

**Last updated:** 2026-06-16  
**Repo:** [github.com/ardithaqi/qa-copilot](https://github.com/ardithaqi/qa-copilot) (public)  
**Workspace path:** local clone path may differ (e.g. `qa-copilot` on disk)  
**Do not use:** old copies under `Desktop/oleaburger/` or other stale clones — this tree is the canonical standalone repo

---

## Maintenance (agents must follow)

When you **add, remove, or change** behavior, files, env vars, or architecture:

1. **Update this file** in the same PR/session — especially “Current state”, “Project structure”, “API contract”, and “Backlog”.
2. Bump **Last updated** to today’s date.
3. Add a one-line entry under **Changelog** at the bottom.
4. Keep **README.md** in sync for user-facing setup (shorter than this file).

If something in this doc conflicts with the code, **the code wins** — fix the doc.

---

## What this project is

**Description:** QA Copilot is an AI-assisted QA platform. Today it is a **test design generator**; the goal is to evolve it into a platform that both **generates and evaluates** QA outputs.

Single-page **Next.js** app. The user pastes a work item (Jira/Azure ticket, bug, user story, acceptance criteria, notes), picks a **work item type** and **LLM provider**, and gets a structured QA report with downloadable markdown/TypeScript exports. API keys stay server-side only.

**North star:** Transform QA Copilot from an AI generator into an AI-assisted quality platform that can both generate and evaluate QA outputs.

---

## Vision & roadmap

### Current goal (generation — shipped)

Accept a requirement or feature description and **generate**:

- Test scenarios  
- API test ideas  
- Edge cases  
- Risk analysis  
- Playwright automation recommendations  
- Playwright code skeletons  
- Missing or unclear information (gaps; no separate Assumptions section in UI)

The current system focuses mainly on **generation**.

### Evaluation (LLM judge — shipped)

After generation, a **second LLM pass** evaluates output quality:

- Coverage %, accuracy %, and quality score  
- **Coverage area gaps** (validation, API, edge, persistence, etc.) — not replacement test cases  
- Accuracy issues (hallucinations only) and quality issues (vagueness/usefulness in existing output)  
- Strengths and improvement suggestions (reviewer feedback, not a replacement test suite)  
- `POST /api/evaluate` — `{ analysis, requirement, provider }` → `evaluateWithLlm()`  
- UI: **AI quality evaluation** panel after every successful analyze (two LLM calls total)  
- Export: `evaluation-report.md`  

**Not yet:** quality dashboard, persisted history, CI integration, batch regression runner.

### Target architecture

```
Requirement
    ↓
Generator LLM          ← POST /api/analyze
    ↓
Generated Output
    ↓
Evaluator LLM          ← evaluateWithLlm() + POST /api/evaluate
    ↓
Coverage score + feedback
```

**Example**

| | |
| - | - |
| **Input** | “User can reset password via email.” |
| **Generated** | Valid email · Invalid email · Empty email · Expired link |
| **Evaluator** | Coverage: 80% · **Gap:** edge coverage appears limited · **Accuracy:** no invented details |

### Evaluation approach

**LLM-as-judge (current):** a second prompt compares serialized QA output against the original requirement. Returns structured JSON — coverage %, quality score, gap lists, strengths, suggestions. Uses the same provider infrastructure as generation (`generateQaAnalysis`).

**Why not golden dataset:** manual `expectedCoverage` lists do not scale; the LLM judge adapts to any requirement without maintaining fixture files.

### Constraints for evaluation work

- Keep explanations simple; focus on practical QA automation use cases.  
- Evaluator behaves as a **Senior QA Lead reviewer** — coverage area gaps, not replacement test cases  
- Evaluator must not invent product details beyond the requirement + generated output  
- Evaluator must not penalize missing exact messages, routes, or API fields unless stated in the ticket  

### Key concepts (interview / design language)

| Term | Meaning |
| ---- | ------- |
| **LLM-as-judge** | Second model pass that scores generated QA output on coverage, completeness, and gaps |
| **Evaluation framework** | Scores outputs on accuracy, coverage areas, and usefulness (clarity, actionability) |
| **AI regression** | Output quality drops after prompt, model, or logic changes |

---

## Current state (2026-06-03)

### Generation

- **10 report sections** in JSON; **6 shown in UI** (risks, grouped test cases, automation, Playwright, API when relevant, final notes). Work item type, summary, business rules, and missing-info are internal only.
- **Test Cases** — scenarios with plain metadata line: `#01 · Type · Priority` (no colored badges).
- **Automation Recommendations** — selective subset of manual cases; priority `High|Medium|Low`; layer `UI|API|Integration|Unit|E2E`; `manualOnly` for stay-manual scenarios.
- **Playwright** — prompt + `resolvePlaywrightSkeleton()` in `src/lib/playwright-skeleton.ts`: aligns tests to automation candidates; replaces generic `TODO: feature name` placeholders; every **High** priority automatable candidate gets a test.
- **Exports** — `test-cases.md`, `{scenario}.spec.ts` filename from primary automation scenario.
- **Secrets** — `.env.local` gitignored; BYOK per provider; see README **API keys (required)**.
- **Optional media** — up to 3 screenshots (5 MB each) or one video (20 MB, Gemini only); base64 in JSON to `/api/analyze` and `/api/evaluate`. Groq = text only; OpenAI = images; Gemini = images + video.

### Evaluation (LLM judge + hardened scoring)

- **`src/lib/evaluation/`** — evaluator prompts, 2 parallel LLM passes (temp 0.1), median/average aggregation, hard checks
- **Input contract** — evaluator receives `originalWorkItem` (user ticket only) + serialized analyzer output; prompts never appear in the report
- **Rubric** — accuracy/coverage/quality derived from issue counts in `evaluator-prompt.ts` (not free-form guessing)  
- **Coverage area gaps** — category-based (`validation`, `api`, `edge`, `persistence`, etc.) via `coverage-areas.ts`  
- **Coverage breakdown** — evaluator returns `coverageTheme` + `coverageBreakdown` (workflow-specific covered/missing labels); hard checks adjust score only  
- **Theme checks** — `hard-checks.ts`; −5 **coverage** per missing theme (not quality)  
- **After analyze** — **Analyze & evaluate** runs `POST /api/evaluate` (3 LLM calls: 1 generate + 2 evaluate). **Analyze** is report-only (1 call).  
- **Panel** — median + average + range, coverage breakdown, coverage area gap notes, accuracy/quality issues  
- **Export** — `evaluation-report.md`

### Intentional MVP boundaries (today)

| In scope | Out of scope (unless user asks) |
| -------- | ------------------------------- |
| One page, paste + analyze (+ optional screenshots/video) | Database, auth, persistent file storage |
| Server-side LLM only | Jira/Azure/Confluence integrations |
| Multi-provider (Groq, OpenAI, Gemini) | Exposing API keys to the browser |
| Browser download exports | Inventing real routes/selectors/APIs |
| Generation + LLM evaluation | Dashboard, CI gates, batch regression runner (see Backlog) |

---

## How to run

```bash
cd /path/to/qa-copilot   # e.g. clone of this repo
npm install
cp .env.local.example .env.local
# Edit .env.local — add key for the provider you use (see below)
npm run dev
# → http://localhost:3000
```

```bash
npm run build   # production build
npm run lint    # ESLint
```

**Env:** Next.js loads **`.env.local` only** (gitignored). Never put real keys in `.env.local.example`.

Restart `npm run dev` after any `.env.local` change.

Do **not** run `npm run build` while `npm run dev` is running (stale `.next` → `Cannot find module './331.js'`). Fix: stop dev, `rm -rf .next`, `npm run dev`.

---

## API keys & secrets (public repo)

- This repo ships **no API keys**. Each user/deployer adds their own.
- **Bring your own key** for the LLM provider selected in the UI (Groq, OpenAI, or Gemini). Only that provider’s env var must be set.
- Keys are read in **`src/lib/llm/*`**, **`POST /api/analyze`**, and **`POST /api/evaluate`** only — never sent to the browser.
- **Never commit** `.env.local` (covered by `.gitignore` → `.env*.local`). Safe to commit `.env.local.example` (placeholders).
- Before pushing to GitHub: `git status` must not list `.env.local`. Rotate keys if they were ever committed.

---

## Environment variables

| Variable | Used when | Default model if unset |
| -------- | --------- | ---------------------- |
| `GROQ_API_KEY` | UI provider = Groq | `GROQ_MODEL` → `llama-3.3-70b-versatile` |
| `OPENAI_API_KEY` | UI provider = OpenAI | `OPENAI_MODEL` → `gpt-4o-mini` |
| `GEMINI_API_KEY` | UI provider = Gemini | `GEMINI_MODEL` → `gemini-2.0-flash` |

Only the key for the **selected provider** must be set for that run. For production (e.g. Vercel), set the same vars in the host dashboard.

---

## User-facing behavior

### Inputs (UI)

1. **Work item type** (radio, default **Auto-detect**):
   - `auto` | `feature` | `bug` | `enhancement` | `technical_change`
2. **AI provider** (radio): `groq` | `openai` | `gemini`
3. **Textarea** — requirement / ticket text  
4. **Screenshots or video (optional)** — up to 3 images or 1 video; sent as base64 with analyze/evaluate requests  
5. **Analyze** — generate report only (1 LLM call)  
6. **Analyze & evaluate** — generate + quality evaluation (3 LLM calls)  

**Media provider support:** Groq — text only (client blocks attachments). OpenAI — images. Gemini — images and video.

### Evaluation flow (Analyze & evaluate button)

1. User clicks **Analyze** → `POST /api/analyze` (generator LLM).  
2. Client calls `POST /api/evaluate` with `{ analysis, originalWorkItem, provider, attachments? }`.  
3. `evaluateWithLlm()` serializes the report, sends evaluator prompt, parses JSON scores.  
4. UI shows **AI quality evaluation** panel above report sections; user can download `evaluation-report.md`.

### Agent workflow (prompt-level, single LLM call)

The system prompt instructs the model to follow these stages internally, then return one JSON object:

1. Requirement Analyzer  
2. Business Rule Extractor  
3. Risk Analyzer  
4. Missing Info Detector  
5. Test Case Generator  
6. Automation Recommendation Selector  
7. Playwright Skeleton Generator (from automation candidates — see below)  
8. API Test Suggestions  
9. Final Report Generator  

### Type-specific strategies

Defined in `src/lib/prompt/strategies.ts` and injected via `buildUserPrompt()`:

| Type | Focus |
| ---- | ----- |
| Feature | Business rules, happy/negative/edge, regression, automation |
| Bug | Reproduction, root cause gaps in missing info, fix validation, regression |
| Enhancement | Changed behavior, compatibility, user impact |
| Technical change | Integration, API, auth, data, security, performance |
| Unknown | Balanced coverage when auto-detect is uncertain |

**Auto-detect:** LLM sets `workItem.detectedType`, `confidence` (High/Medium/Low), `reasoning`.  
**Manual type:** User override → `effectiveType` = selection, `detectedType` = null, confidence typically High.

### Quality rules (must preserve)

- Analyze **only** provided text; do not invent routes, selectors, test data, API endpoints, or credentials.
- List gaps used internally in `missingOrUnclearInformation[]`; surface follow-ups in `finalQaNotes` for the user-facing report.
- **Playwright:** generated from **Automation Recommendations** (one test per candidate when possible); every **High** priority candidate must appear; `// TODO:` for routes, selectors, auth; no invented URLs/selectors/credentials.
- **API suggestions:** only when input implies backend; use TODO placeholders for unknown endpoints.

### Playwright skeleton pipeline

1. **Prompt** (`src/lib/prompt/agent-prompt.ts` — `PLAYWRIGHT_SKELETON_RULES`): LLM must use `automationCandidates` as primary source; meaningful `test('should …')` names; no empty `TODO: add scenario` tests.
2. **Parse** (`parse-analysis.ts`): `playwrightTestSkeletons` → `resolvePlaywrightSkeleton(analysis)`.
3. **Fallback** (`playwright-skeleton.ts`):
   - If LLM output is generic → `generatePlaywrightFromCandidates()` (all non–`manualOnly` candidates, sorted High → Medium → Low).
   - If LLM output is OK but missing **High** candidates → append tests for missing scenarios.
   - Strips lines containing `ASSUMPTION` from exported/displayed code.
4. **Display/export** (`AnalysisResults.tsx`, `export-reports.ts` → `buildPlaywrightSpec()`): always runs `resolvePlaywrightSkeleton()`; download filename from `derivePlaywrightExportSlug()` (primary UI/E2E automation scenario).

### Output sections (UI order)

User-facing report only — internal JSON fields (`workItem`, `summary`, `businessRules`, `missingOrUnclearInformation`) still generated for parsing and strategy but **not shown** in UI or `qa-report.md`.

1. **Work item type** — selected, effective, detected (auto), confidence, reasoning  
2. **Risks** — product, technical, regression, security/data  
3. **Test cases** — grouped headers: Happy paths TC, Negative TC, Edge TC, etc.  
3. **Automation recommendations** — priority High|Medium|Low; layer; why automate / keep manual  
4. **Playwright skeleton** — resolved skeleton (not raw LLM placeholder)  
5. **API test suggestions** — only when backend/API behavior is implied (hidden when N/A)  
6. **Final QA notes** — brief wrap-up and open questions  

### Downloads (client-side)

`src/lib/export-reports.ts` + `src/components/ExportDownloads.tsx`:

| File | Content |
| ---- | ------- |
| `qa-report.md` | Full report |
| `test-cases.md` | Test cases only |
| `automation-candidates.md` | Automation recommendations |
| `{test-scenario}.spec.ts` | Playwright skeleton (filename from primary automation scenario / test title, kebab-case) |
| `api-test-suggestions.md` | API ideas |
| `evaluation-report.md` | LLM quality evaluation (after every analyze; from evaluation panel) |

---

## API contract

**`POST /api/analyze`**

Request body:

```json
{
  "input": "string (required)",
  "provider": "groq | openai | gemini",
  "workItemType": "auto | feature | bug | enhancement | technical_change",
  "attachments": [
    {
      "kind": "image | video",
      "mimeType": "string",
      "fileName": "string",
      "dataBase64": "string"
    }
  ]
}
```

Success:

```json
{
  "analysis": { /* QAAnalysis — see src/types/qa-analysis.ts */ },
  "provider": "groq"
}
```

Error: `{ "error": "user-friendly message" }` with 400 / 502 / 500 as appropriate.

**Route:** `src/app/api/analyze/route.ts`  
**Flow:** validate → `generateAnalysis(input, provider, workItemType, attachments?)` → `parseAnalysisResponse` (includes `resolvePlaywrightSkeleton`) → JSON

**`QAAnalysis`** (`src/types/qa-analysis.ts`): no `assumptions` field. Legacy LLM `assumptions` in JSON are ignored.

**`POST /api/evaluate`**

Request body:

```json
{
  "analysis": { /* QAAnalysis */ },
  "originalWorkItem": "original ticket text (required)",
  "provider": "groq | openai | gemini",
  "attachments": [ /* same shape as analyze; optional */ ]
}
```

Success:

```json
{
  "evaluation": {
    "coveragePercent": 80,
    "accuracyScore": 95,
    "qualityScore": 75,
    "summary": "Overall assessment…",
    "coverageAreaGaps": [
      { "area": "persistence", "note": "State persistence coverage appears limited." }
    ],
    "accuracyIssues": [],
    "qualityIssues": [],
    "strengths": ["Clear negative validation cases"],
    "improvementSuggestions": ["Expand duplicate-submit coverage areas"],
    "method": "llm+hardened"
  },
  "originalWorkItem": "User can reset password via email",
  "provider": "groq"
}
```

**Route:** `src/app/api/evaluate/route.ts`  
**Flow:** validate `analysis` + `originalWorkItem` → `evaluateWithLlm()` → `parseEvaluationResponse()` → JSON

---

## Architecture

```
QA Copilot/
├── AGENTS.md                 ← this file (handoff for agents)
├── README.md                 ← user setup (keep shorter)
├── .env.local.example
├── .env.local                ← gitignored, real keys
├── package.json
├── next.config.ts
└── src/
    ├── app/
    │   ├── page.tsx                      # UI: analyze + auto LLM evaluation
    │   ├── layout.tsx
    │   ├── globals.css
    │   └── api/
    │       ├── analyze/route.ts
    │       └── evaluate/route.ts
    ├── components/
    │   ├── AnalysisResults.tsx           # report + evaluation panel
    │   ├── EvaluationResults.tsx
    │   ├── ExportDownloads.tsx
    │   └── MediaAttachmentsInput.tsx
    ├── types/
    │   ├── qa-analysis.ts
    │   ├── attachments.ts
    │   └── work-item.ts
    └── lib/
        ├── evaluation/
        │   ├── types.ts
        │   ├── coverage-areas.ts     # coverage category ids + labels
        │   ├── evaluator-prompt.ts
        │   ├── aggregate-evaluation.ts
        │   ├── hard-checks.ts
        │   ├── serialize-analysis.ts
        │   ├── llm-evaluator.ts
        │   ├── parse-evaluation.ts
        │   └── index.ts
        ├── prompt/
        │   ├── agent-prompt.ts         # buildSystemPrompt, buildUserPrompt
        │   ├── senior-qa-coverage.ts   # generic senior QA coverage rules
        │   ├── strategies.ts           # per-type strategy text
        │   └── index.ts
        ├── llm/
        │   ├── types.ts                # UiLlmProviderId, UI_LLM_PROVIDERS
        │   ├── index.ts                # generateQaAnalysis(provider, params)
        │   ├── multimodal.ts           # OpenAI vision + Gemini inline parts
        │   ├── openai-compatible.ts    # shared chat completions + JSON mode
        │   ├── groq.ts
        │   ├── openai.ts
        │   ├── gemini.ts               # @google/generative-ai
        │   └── local.ts                # stub — not in UI yet
        ├── attachments/
        │   ├── validate.ts             # parse, size/type checks, provider rules
        │   ├── client.ts               # browser File → base64
        │   └── index.ts
        ├── generate-analysis.ts        # wires prompt + llm
        ├── work-item-text.ts           # extractOriginalWorkItem from user paste
        ├── parse-analysis.ts           # JSON → QAAnalysis (+ legacy fields)
        ├── analysis-errors.ts          # friendly error messages
        ├── playwright-skeleton.ts      # resolvePlaywrightSkeleton, generatePlaywrightFromCandidates
        └── export-reports.ts           # markdown/ts builders + download (ExportFileId includes test-cases)
```

**Key design choices**

- **One shared prompt** for all providers; only `src/lib/llm/*` differs per vendor.
- **Structured JSON** from LLM; parser tolerates legacy field names (`happyPathTestCases`, etc.).
- **No API keys in frontend** — only `provider` id is sent from browser.
- **Playwright reliability** — server-side fallback when LLM returns generic skeletons.
- **LLM-as-judge evaluation** — second `generateQaAnalysis` call with evaluator prompts; runs after every analyze.

---

## Tech stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS v4  
- `openai` npm package — Groq + OpenAI (Groq base URL: `https://api.groq.com/openai/v1`)  
- `@google/generative-ai` — Gemini (`responseMimeType: application/json`)  
- No database, no auth  

---

## Git & publishing

- `.gitignore`: `.env*.local`, `.next/`, `node_modules/`, etc.
- **Commit:** source, `package.json`, `.env.local.example`, `README.md`, `AGENTS.md`.
- **Never commit:** `.env.local`, real API keys, `.next/`.
- README documents **API keys (required)** for public clones.
- Check `git status` before first push; rotate keys if `.env.local` was ever staged.

---

## Backlog / not implemented

Use this section for future work; remove items when done and note in Changelog.

### Evaluation (future)

- [x] **LLM evaluator** — `evaluateWithLlm()`, `/api/evaluate`, evaluation UI panel  
- [x] **Evaluation reports** — `evaluation-report.md` download  
- [ ] **Quality dashboard** — scores over time  
- [ ] **Regression tracking** — compare prompt / model versions on saved requirements (baseline storage)  
- [ ] **Prompt version comparison** — tag prompts, diff scores across versions  
- [ ] **Model comparison** — same requirement, multiple providers, side-by-side scores  
- [ ] **AI output history** — persist past analyses + evaluations for trend view  
- [ ] **Hallucination detection** — flag invented routes, APIs, selectors vs input  
- [ ] **Coverage trend tracking** — chart scores across runs  
- [ ] **CI/CD integration** — fail build or warn on quality drop vs baseline  
- [ ] **Batch regression runner** — re-run a saved requirement set without manual fixtures  

### Other

- [ ] **Local Llama / Ollama** — `src/lib/llm/local.ts` exists; add UI provider + env (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`) when requested  
- [ ] **Automated tests** — none yet (no Jest/Playwright test suite for the app itself)  
- [ ] **Streaming responses** — analyze is single blocking JSON response  
- [ ] **Rate limiting / usage caps** — app-level limits not implemented (rely on provider quotas)  
- [ ] **Persist history** — no saved analyses (overlaps with eval backlog)  

---

## Common issues

| Symptom | Likely cause |
| ------- | ------------- |
| API key error for wrong provider | User selected OpenAI/Gemini but only `GROQ_API_KEY` in `.env.local` |
| Quota / 429 | Provider billing or free tier exhausted |
| Generic Playwright (`TODO: feature name`) | Re-analyze; parser should replace via `resolvePlaywrightSkeleton` — if still generic, check `automationCandidates` empty |
| `Cannot find module './331.js'` | Stale `.next` after `npm run build` during `npm run dev` — `rm -rf .next`, restart dev |
| Env change ignored | Dev server not restarted |
| Groq + screenshot attached | Groq has no vision — switch to OpenAI or Gemini |
| Video with OpenAI selected | Video requires Gemini |

---

## Changelog (doc only)

| Date | Change |
| ---- | ------ |
| 2026-06-03 | **Streamlined report UI:** risks, grouped test cases, automation, Playwright, API (when relevant), final notes; hide work item type, summary, business rules, missing-info. |
| 2026-06-03 | **Optional media:** screenshots (OpenAI/Gemini) or video (Gemini); `MediaAttachmentsInput`, `src/lib/attachments/`, multimodal LLM wiring. |
| 2026-06-03 | **Usage UI:** collapsible Usage details after runs; server `logUsageSummary` for operators. |
| 2026-06-03 | **Hardened evaluation:** temp 0.1, fixed rubric, multi-run median/average, hard checks + penalty. |
| 2026-06-03 | **Evaluation → LLM judge:** replaced golden dataset / deterministic scorer with `evaluateWithLlm()`; removed `/api/evaluate/dataset` and golden dataset files. |
| 2026-06-03 | **Evaluation (initial):** golden dataset + deterministic scorer (later replaced by LLM judge). |
| 2026-06-03 | **Vision:** generator → generator + evaluator; golden dataset, Option 1/2 eval, target architecture, eval backlog. Repo URL; removed stale “initial git commit” backlog item. |
| 2026-06-03 | Renamed project from QA Architect back to **QA Copilot** (UI, docs, `package.json` name). |
| 2026-06-02 | **AGENTS.md full sync:** current state, API keys/public repo, Playwright pipeline, workspace path, git publish, common issues; Test Cases UI metadata. |
| 2026-06-02 | README: API keys (required), BYOK, do not commit `.env.local`. |
| 2026-06-02 | Playwright skeletons aligned to Automation Recommendations; High/Medium/Low; `playwright-skeleton.ts` fallback. |
| 2026-06-02 | Renamed Manual Test Cases → Test Cases; Automation Recommendations; export `test-cases.md`. |
| 2026-06-02 | Removed Assumptions section; Playwright `.spec.ts` filename from automation scenario; strip ASSUMPTION lines. |
| 2026-06-02 | Renamed project from QA Copilot to **QA Architect** (UI, docs, `package.json` name). |
| 2026-06-01 | Created AGENTS.md. Documented Test Design Agent, multi-provider, work item types, 11 output sections, exports, architecture. |
| 2026-06-01 | Prior session: MVP from oleaburger → standalone; Groq/Gemini/OpenAI providers; improved prompts; agent workflow. |
| 2026-06-16 | **Evaluator:** coverage area gaps (category-based reviewer); no TC-type gaps; quality rules forbid penalizing unspecified ticket details. |
| 2026-06-16 | **Analyzer/evaluator split:** coverage-driven generator; evaluator reports coverage areas + accuracy/quality issues. |
| 2026-06-16 | **Evaluation:** split accuracy vs coverage in AI quality evaluation output. |
| 2026-06-16 | **Generator prompt:** require more edge-case coverage for async/event-driven inputs in Analyze output. |
| 2026-06-16 | **Coverage breakdown:** evaluator LLM returns dynamic `coverageTheme` and workflow-specific covered/missing labels (replaces regex heuristics). |
| 2026-06-16 | **Evaluator:** flag duplication/over-automation as quality issues; do not flag correct reproduction expected results as vague. |
