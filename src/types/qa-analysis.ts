import type { UiLlmProviderId } from "@/lib/llm/types";
import type { LlmUsageSummary } from "@/lib/llm/usage-types";
import type { MediaAttachment } from "@/types/attachments";
import type {
  ConfidenceLevel,
  WorkItemType,
  WorkItemTypeSelection,
} from "@/types/work-item";

export type { UiLlmProviderId };

export type TestCaseCategory =
  | "happy_path"
  | "negative"
  | "edge"
  | "regression"
  | "reproduction"
  | "other";

export const TEST_CASE_CATEGORY_LABELS: Record<TestCaseCategory, string> = {
  happy_path: "Happy path",
  negative: "Negative",
  edge: "Edge",
  regression: "Regression",
  reproduction: "Reproduction",
  other: "Other",
};

export function formatTestCaseCategory(category: string): string {
  if (category in TEST_CASE_CATEGORY_LABELS) {
    return TEST_CASE_CATEGORY_LABELS[category as TestCaseCategory];
  }
  return category.replace(/_/g, " ");
}

export interface QATestCase {
  title: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  priority: string;
  automationSuitability: string;
  category: TestCaseCategory;
}

export interface AutomationCandidate {
  scenario: string;
  priority: string;
  whyAutomate: string;
  whyNotAutomate: string;
  layer: string;
  manualOnly: boolean;
}

export interface WorkItemInfo {
  selectedType: WorkItemTypeSelection;
  effectiveType: WorkItemType;
  detectedType: WorkItemType | null;
  confidence: ConfidenceLevel | null;
  reasoning: string;
}

export interface BusinessRules {
  explicit: string[];
  implied: string[];
}

export interface RiskGroups {
  product: string[];
  technical: string[];
  regression: string[];
  securityOrData: string[];
}

export interface QAAnalysis {
  workItem: WorkItemInfo;
  summary: string;
  businessRules: BusinessRules;
  missingOrUnclearInformation: string[];
  risks: RiskGroups;
  manualTestCases: QATestCase[];
  automationCandidates: AutomationCandidate[];
  playwrightTestSkeletons: string;
  apiTestSuggestions: string[];
  finalQaNotes: string;
}

export interface AnalyzeRequest {
  input: string;
  provider: UiLlmProviderId;
  workItemType: WorkItemTypeSelection;
  attachments?: MediaAttachment[];
}

export interface AnalyzeSuccessResponse {
  analysis: QAAnalysis;
  provider: UiLlmProviderId;
  usage: LlmUsageSummary;
}

export interface AnalyzeErrorResponse {
  error: string;
}
