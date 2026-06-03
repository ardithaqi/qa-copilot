# QA Copilot — Agent & handoff context

> **For AI agents and new chat sessions:** Read this file first. It describes the real codebase as of the last update below.  
> **For humans:** Paste into a new Cursor chat: *“Read `AGENTS.md` in this workspace and continue from there.”*

**Last updated:** 2026-06-03  
**Workspace path:** `/Users/ardi/Desktop/test` (public repo; clone path may differ)  
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

**Description:** QA Copilot, an AI Test Design Agent that analyzes requirements, bugs, enhancements, and technical changes to generate QA strategies, risk assessments, automation candidates, and Playwright test skeletons.

Single-page **Next.js** app. The user pastes a work item (Jira/Azure ticket, bug, user story, acceptance criteria, notes), picks a **work item type** and **LLM provider**, and gets a structured QA report with downloadable markdown/TypeScript exports. API keys stay server-side only.

### Current state (2026-06-02)

- **10 report sections** (no Assumptions section; gaps go in Missing or Unclear Information).
- **Test Cases** — scenarios with plain metadata line: `#01 · Type · Priority` (no colored badges).
- **Automation Recommendations** — priority `High|Medium|Low` (P0/P1/P2 normalized in parser); layer UI|API|E2E; why automate / keep manual.
- **Playwright** — prompt + `resolvePlaywrightSkeleton()` in `src/lib/playwright-skeleton.ts`: aligns tests to automation candidates; replaces generic `TODO: feature name` placeholders; every **High** priority automatable candidate gets a test.
- **Exports** — `test-cases.md`, `{scenario}.spec.ts` filename from primary automation scenario.
- **Secrets** — `.env.local` gitignored; BYOK per provider; see README **API keys (required)**.

### Intentional MVP boundaries

| In scope | Out of scope (unless user asks) |
| -------- | ------------------------------- |
| One page, paste + analyze | Database, auth, file upload |
| Server-side LLM only | Jira/Azure/Confluence integrations |
| Multi-provider (Groq, OpenAI, Gemini) | Exposing API keys to the browser |
| Browser download exports | Inventing real routes/selectors/APIs |

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
- Keys are read in **`src/lib/llm/*`** and **`POST /api/analyze`** only — never sent to the browser.
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
- List gaps and open questions in `missingOrUnclearInformation[]` — no separate assumptions section.
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

1. Work Item Type (selected, effective, detected, confidence, reasoning)  
2. Feature / Bug / Change Summary  
3. Business Rules (explicit + implied)  
4. Missing or Unclear Information  
5. Risks (product, technical, regression, security/data)  
6. Test Cases — `manualTestCases[]` in JSON; UI label **Test Cases**; metadata: `#nn · Type · Priority` (labels in `TEST_CASE_CATEGORY_LABELS`); no automation badge on cards  
7. Automation Recommendations — `automationCandidates[]`; priority High|Medium|Low; layer; why automate / why not yet / keep manual  
8. Playwright Skeletons — resolved skeleton (not raw LLM placeholder)  
9. API Test Suggestions  
10. Final QA Notes  

### Downloads (client-side)

`src/lib/export-reports.ts` + `src/components/ExportDownloads.tsx`:

| File | Content |
| ---- | ------- |
| `qa-report.md` | Full report |
| `test-cases.md` | Test cases only |
| `automation-candidates.md` | Automation recommendations |
| `{test-scenario}.spec.ts` | Playwright skeleton (filename from primary automation scenario / test title, kebab-case) |
| `api-test-suggestions.md` | API ideas |

---

## API contract

**`POST /api/analyze`**

Request body:

```json
{
  "input": "string (required)",
  "provider": "groq | openai | gemini",
  "workItemType": "auto | feature | bug | enhancement | technical_change"
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
**Flow:** validate → `generateAnalysisJson(input, provider, workItemType)` → `parseAnalysisResponse(raw, workItemType)` (includes `resolvePlaywrightSkeleton`) → JSON

**`QAAnalysis`** (`src/types/qa-analysis.ts`): no `assumptions` field. Legacy LLM `assumptions` in JSON are ignored.

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
    │   ├── page.tsx                    # UI: selectors, textarea, analyze
    │   ├── layout.tsx
    │   ├── globals.css
    │   └── api/analyze/route.ts        # POST handler
    ├── components/
    │   ├── AnalysisResults.tsx         # 10 sections display
    │   └── ExportDownloads.tsx         # download buttons
    ├── types/
    │   ├── qa-analysis.ts              # QAAnalysis, QATestCase, API types
    │   └── work-item.ts                # work item enums + labels
    └── lib/
        ├── prompt/
        │   ├── agent-prompt.ts         # buildSystemPrompt, buildUserPrompt
        │   ├── strategies.ts           # per-type strategy text
        │   └── index.ts
        ├── llm/
        │   ├── types.ts                # UiLlmProviderId, UI_LLM_PROVIDERS
        │   ├── index.ts                # generateQaAnalysis(provider, params)
        │   ├── openai-compatible.ts    # shared chat completions + JSON mode
        │   ├── groq.ts
        │   ├── openai.ts
        │   ├── gemini.ts               # @google/generative-ai
        │   └── local.ts                # stub — not in UI yet
        ├── generate-analysis.ts        # wires prompt + llm
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

- [ ] **Local Llama / Ollama** — `src/lib/llm/local.ts` exists; add UI provider + env (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`) when requested  
- [ ] **Automated tests** — none yet (no Jest/Playwright test suite for the app itself)  
- [ ] **Streaming responses** — analyze is single blocking JSON response  
- [ ] **Rate limiting / usage caps** — app-level limits not implemented (rely on provider quotas)  
- [ ] **Persist history** — no saved analyses  
- [ ] **Initial git commit** — if user wants version control  

---

## Common issues

| Symptom | Likely cause |
| ------- | ------------- |
| API key error for wrong provider | User selected OpenAI/Gemini but only `GROQ_API_KEY` in `.env.local` |
| Quota / 429 | Provider billing or free tier exhausted |
| Generic Playwright (`TODO: feature name`) | Re-analyze; parser should replace via `resolvePlaywrightSkeleton` — if still generic, check `automationCandidates` empty |
| `Cannot find module './331.js'` | Stale `.next` after `npm run build` during `npm run dev` — `rm -rf .next`, restart dev |
| Env change ignored | Dev server not restarted |
| OpenAI billing from Kosovo | ChatGPT ≠ API billing; separate platform.openai.com credits |

---

## Changelog (doc only)

| Date | Change |
| ---- | ------ |
| 2026-06-03 | Renamed project from QA Architect back to **QA Copilot** (UI, docs, `package.json` name). |
| 2026-06-02 | **AGENTS.md full sync:** current state, API keys/public repo, Playwright pipeline, workspace path, git publish, common issues; Test Cases UI metadata. |
| 2026-06-02 | README: API keys (required), BYOK, do not commit `.env.local`. |
| 2026-06-02 | Playwright skeletons aligned to Automation Recommendations; High/Medium/Low; `playwright-skeleton.ts` fallback. |
| 2026-06-02 | Renamed Manual Test Cases → Test Cases; Automation Recommendations; export `test-cases.md`. |
| 2026-06-02 | Removed Assumptions section; Playwright `.spec.ts` filename from automation scenario; strip ASSUMPTION lines. |
| 2026-06-02 | Renamed project from QA Copilot to **QA Architect** (UI, docs, `package.json` name). |
| 2026-06-01 | Created AGENTS.md. Documented Test Design Agent, multi-provider, work item types, 11 output sections, exports, architecture. |
| 2026-06-01 | Prior session: MVP from oleaburger → standalone; Groq/Gemini/OpenAI providers; improved prompts; agent workflow. |
