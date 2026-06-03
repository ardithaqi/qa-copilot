# QA Copilot

QA Copilot, an AI Test Design Agent that analyzes requirements, bugs, enhancements, and technical changes to generate QA strategies, risk assessments, automation candidates, and Playwright test skeletons.

**New chat / AI agent?** Read **[AGENTS.md](./AGENTS.md)** for full project context, architecture, API contract, and what to update when you change the codebase.

## Agent workflow

The LLM follows a multi-step workflow internally:

1. Requirement Analyzer  
2. Business Rule Extractor  
3. Risk Analyzer  
4. Missing Info Detector  
5. Test Case Generator  
6. Automation Candidate Selector  
7. Playwright Skeleton Generator  
8. API Test Suggestions  
9. Final Report Generator  

## Work item types

- **Auto-detect** (default) — classifies as Feature, Bug, Enhancement, Technical Change, or Unknown (with confidence + reasoning)  
- **Feature / Bug / Enhancement / Technical Change** — manual override with type-specific QA strategy  

## Output sections

1. Work Item Type  
2. Feature / Bug / Change Summary  
3. Business Rules  
4. Missing or Unclear Information  
5. Risks  
6. Test Cases  
7. Automation Recommendations  
8. Playwright Skeletons  
9. API Test Suggestions  
10. Final QA Notes  

## Downloads

From the results UI you can download:

- `qa-report.md` — full report  
- `test-cases.md`  
- `automation-candidates.md` (automation recommendations)  
- `{test-scenario}.spec.ts` — Playwright skeleton (filename from what the spec verifies)  
- `api-test-suggestions.md`  

## Setup

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local — see API keys below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API keys (required)

This repo does **not** include API keys. **Bring your own key** for whichever LLM provider you select in the UI (Groq, OpenAI, or Gemini). You only need to set the variable for that provider—the others can stay as placeholders in `.env.local`.

## Environment variables

| Variable | Provider | Default model |
| -------- | -------- | ------------- |
| `GROQ_API_KEY` | Groq | `GROQ_MODEL` → `llama-3.3-70b-versatile` |
| `OPENAI_API_KEY` | OpenAI | `OPENAI_MODEL` → `gpt-4o-mini` |
| `GEMINI_API_KEY` | Gemini | `GEMINI_MODEL` → `gemini-2.0-flash` |

## Architecture

```
src/lib/prompt/          # Shared agent prompt + per-type strategies
src/lib/llm/             # Groq, OpenAI, Gemini providers (+ local stub)
src/lib/parse-analysis.ts
src/lib/export-reports.ts  # Browser file downloads
```

## Assumption

Local Llama/Ollama is prepared in `src/lib/llm/local.ts` but not exposed in the UI yet.
