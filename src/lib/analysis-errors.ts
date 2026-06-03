const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq",
  openai: "OpenAI",
  gemini: "Gemini",
  local: "Local Llama",
};

function providerLabel(provider?: string): string {
  if (!provider) return "AI";
  return PROVIDER_LABELS[provider] ?? provider;
}

export function toUserFacingAnalysisError(
  error: unknown,
  provider?: string
): string {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";
  const label = providerLabel(provider);

  if (/UNSUPPORTED_PROVIDER/i.test(message)) {
    return message.replace(/^UNSUPPORTED_PROVIDER:\s*/i, "");
  }

  if (/LOCAL_LLM_NOT_AVAILABLE/i.test(message)) {
    return "Local Llama/Ollama is not available yet. Please select Groq, OpenAI, or Gemini.";
  }

  if (/GROQ_API_KEY is not configured/i.test(message)) {
    return "Groq API key is missing. Add GROQ_API_KEY to .env.local and restart the dev server.";
  }

  if (/OPENAI_API_KEY is not configured/i.test(message)) {
    return "OpenAI API key is missing. Add OPENAI_API_KEY to .env.local and restart the dev server.";
  }

  if (/GEMINI_API_KEY is not configured/i.test(message)) {
    return "Gemini API key is missing. Add GEMINI_API_KEY to .env.local and restart the dev server.";
  }

  if (/invalid response format|missing required sections/i.test(message)) {
    return message;
  }

  if (/401|403|invalid.*api.*key|authentication/i.test(message)) {
    return `${label} API key is invalid or expired. Check your .env.local configuration and restart the dev server.`;
  }

  if (/429|quota|rate limit/i.test(message)) {
    return `${label} rate limit or quota exceeded. Wait a moment and try again, or check your provider console.`;
  }

  if (
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|fetch failed|network|socket/i.test(
      message
    )
  ) {
    return `Could not reach ${label}. Check your internet connection and try again.`;
  }

  if (/timeout|timed out/i.test(message)) {
    return "The analysis took too long. Try a shorter requirement or try again.";
  }

  if (/No analysis was returned/i.test(message)) {
    return `${label} returned an empty response. Please try again.`;
  }

  return message.length > 280
    ? `${label} analysis failed. Please try again or shorten the input.`
    : message;
}
