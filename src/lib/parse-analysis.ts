import type {
  AutomationCandidate,
  QAAnalysis,
  QATestCase,
  TestCaseCategory,
  WorkItemInfo,
} from "@/types/qa-analysis";
import {
  normalizeAutomationPriority,
  resolvePlaywrightSkeleton,
} from "@/lib/playwright-skeleton";
import {
  CONFIDENCE_LEVELS,
  type ConfidenceLevel,
  type WorkItemType,
  type WorkItemTypeSelection,
  isWorkItemTypeSelection,
  normalizeWorkItemType,
} from "@/types/work-item";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseConfidence(value: unknown): ConfidenceLevel | null {
  const raw = asString(value);
  if (!raw) return null;
  const match = CONFIDENCE_LEVELS.find(
    (c) => c.toLowerCase() === raw.toLowerCase()
  );
  return match ?? null;
}

function parseAutomationSuitability(value: unknown): string {
  const raw = asString(value);
  const normalized = raw.toLowerCase();
  if (normalized === "yes") return "Yes";
  if (normalized === "no") return "No";
  if (normalized === "maybe") return "Maybe";
  return raw || "Maybe";
}

function parseCategory(value: unknown): TestCaseCategory {
  const raw = asString(value).toLowerCase().replace(/\s+/g, "_");
  const allowed: TestCaseCategory[] = [
    "happy_path",
    "negative",
    "edge",
    "regression",
    "reproduction",
    "other",
  ];
  if (allowed.includes(raw as TestCaseCategory)) return raw as TestCaseCategory;
  if (raw.includes("happy")) return "happy_path";
  if (raw.includes("negative")) return "negative";
  if (raw.includes("edge")) return "edge";
  if (raw.includes("regression")) return "regression";
  if (raw.includes("repro")) return "reproduction";
  return "other";
}

function parseSteps(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const asText = asString(value);
  if (!asText) return [];
  return asText
    .split(/\n|(?=\d+\)\s)|(?=\d+\.\s)/)
    .map((s) => s.replace(/^\d+[\).]\s*/, "").trim())
    .filter(Boolean);
}

function parseTestCaseObject(
  value: unknown,
  defaultCategory: TestCaseCategory
): QATestCase | null {
  if (typeof value === "string") {
    return {
      title: value.slice(0, 200),
      preconditions: "",
      steps: [],
      expectedResult: "",
      priority: "P1",
      automationSuitability: "Maybe",
      category: defaultCategory,
    };
  }
  if (!value || typeof value !== "object") return null;

  const obj = value as Record<string, unknown>;
  const title = asString(obj.title);
  if (!title) return null;

  return {
    title,
    preconditions: asString(obj.preconditions ?? obj.precondition),
    steps: parseSteps(obj.steps),
    expectedResult: asString(obj.expectedResult ?? obj.expected),
    priority: asString(obj.priority) || "P1",
    automationSuitability: parseAutomationSuitability(
      obj.automationSuitability ?? obj.automation
    ),
    category: parseCategory(obj.category ?? defaultCategory),
  };
}

function asTestCaseArray(
  value: unknown,
  defaultCategory: TestCaseCategory
): QATestCase[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => parseTestCaseObject(item, defaultCategory))
    .filter((tc): tc is QATestCase => tc !== null);
}

function mergeLegacyTestCases(parsed: Record<string, unknown>): QATestCase[] {
  const manual = asTestCaseArray(parsed.manualTestCases, "other");
  if (manual.length > 0) return manual;

  return [
    ...asTestCaseArray(parsed.happyPathTestCases, "happy_path"),
    ...asTestCaseArray(parsed.negativeTestCases, "negative"),
    ...asTestCaseArray(parsed.edgeCases, "edge"),
    ...asStringArray(parsed.regressionTestIdeas).map((title) => ({
      title,
      preconditions: "",
      steps: [],
      expectedResult: "",
      priority: "P1",
      automationSuitability: "Maybe",
      category: "regression" as const,
    })),
  ];
}

function parseAutomationCandidates(value: unknown): AutomationCandidate[] {
  if (!Array.isArray(value)) {
    return asStringArray(value).map((line) => ({
      scenario: line,
      priority: "Medium",
      whyAutomate: "",
      whyNotAutomate: "",
      layer: "E2E",
      manualOnly: false,
    }));
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return {
          scenario: item,
          priority: "Medium",
          whyAutomate: "",
          whyNotAutomate: "",
          layer: "E2E",
          manualOnly: false,
        };
      }
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const scenario = asString(obj.scenario ?? obj.title);
      if (!scenario) return null;
      return {
        scenario,
        priority: normalizeAutomationPriority(asString(obj.priority) || "Medium"),
        whyAutomate: asString(obj.whyAutomate ?? obj.rationale),
        whyNotAutomate: asString(obj.whyNotAutomate ?? obj.whyNot),
        layer: asString(obj.layer) || "E2E",
        manualOnly: Boolean(obj.manualOnly),
      };
    })
    .filter((c): c is AutomationCandidate => c !== null);
}

function parseRisks(parsed: Record<string, unknown>): QAAnalysis["risks"] {
  const risks = parsed.risks;
  if (risks && typeof risks === "object") {
    const r = risks as Record<string, unknown>;
    return {
      product: asStringArray(r.product),
      technical: asStringArray(r.technical),
      regression: asStringArray(r.regression),
      securityOrData: asStringArray(r.securityOrData ?? r.security),
    };
  }

  const legacy = asStringArray(parsed.risksOrPossibleBugs);
  return {
    product: legacy,
    technical: [],
    regression: [],
    securityOrData: [],
  };
}

function parseBusinessRules(parsed: Record<string, unknown>): QAAnalysis["businessRules"] {
  const br = parsed.businessRules;
  if (br && typeof br === "object") {
    const b = br as Record<string, unknown>;
    return {
      explicit: asStringArray(b.explicit),
      implied: asStringArray(b.implied),
    };
  }
  return { explicit: [], implied: [] };
}

function parseWorkItem(
  parsed: Record<string, unknown>,
  fallbackSelection: WorkItemTypeSelection
): WorkItemInfo {
  const raw = parsed.workItem;
  let selectedType = fallbackSelection;
  let effectiveType: WorkItemType = "unknown";
  let detectedType: WorkItemType | null = null;
  let confidence: ConfidenceLevel | null = null;
  let reasoning = "";

  if (raw && typeof raw === "object") {
    const w = raw as Record<string, unknown>;
    const sel = asString(w.selectedType).toLowerCase();
    if (isWorkItemTypeSelection(sel)) selectedType = sel;

    effectiveType = normalizeWorkItemType(
      asString(w.effectiveType) || asString(w.detectedType) || "unknown"
    );

    const det = asString(w.detectedType);
    detectedType = det ? normalizeWorkItemType(det) : null;
    confidence = parseConfidence(w.confidence);
    reasoning = asString(w.reasoning);
  }

  if (selectedType !== "auto") {
    effectiveType = normalizeWorkItemType(selectedType);
    detectedType = null;
    confidence = confidence ?? "High";
    reasoning =
      reasoning || "User manually selected this work item type.";
  }

  return {
    selectedType,
    effectiveType,
    detectedType,
    confidence,
    reasoning,
  };
}

export function parseAnalysisResponse(
  raw: string,
  requestedWorkItemType: WorkItemTypeSelection = "auto"
): QAAnalysis {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    : trimmed;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    throw new Error(
      "The AI returned an invalid response format. Please try again."
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      "The AI returned an invalid response format. Please try again."
    );
  }

  const summary =
    asString(parsed.summary) ||
    asString(parsed.featureSummary) ||
    "";

  const manualTestCases = mergeLegacyTestCases(parsed);

  if (!summary && manualTestCases.length === 0) {
    throw new Error(
      "The AI response was empty or missing required sections. Please try again."
    );
  }

  const missingOrUnclearInformation = asStringArray(
    parsed.missingOrUnclearInformation ??
      parsed.missingOrUnclearRequirements
  );

  const apiTestSuggestions = asStringArray(
    parsed.apiTestSuggestions ?? parsed.apiBackendTestIdeas
  );

  const automationCandidates = parseAutomationCandidates(
    parsed.automationCandidates
  );

  const analysisWithoutSkeleton: QAAnalysis = {
    workItem: parseWorkItem(parsed, requestedWorkItemType),
    summary,
    businessRules: parseBusinessRules(parsed),
    missingOrUnclearInformation,
    risks: parseRisks(parsed),
    manualTestCases,
    automationCandidates,
    playwrightTestSkeletons: asString(parsed.playwrightTestSkeletons),
    apiTestSuggestions:
      apiTestSuggestions.length > 0
        ? apiTestSuggestions
        : ["N/A — no API/backend behavior described in the input."],
    finalQaNotes: asString(parsed.finalQaNotes ?? parsed.finalQANotes),
  };

  return {
    ...analysisWithoutSkeleton,
    playwrightTestSkeletons: resolvePlaywrightSkeleton(analysisWithoutSkeleton),
  };
}
