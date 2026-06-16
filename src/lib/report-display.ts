import type { QATestCase, TestCaseCategory } from "@/types/qa-analysis";
import { TEST_CASE_CATEGORY_LABELS } from "@/types/qa-analysis";

export const TEST_CASE_GROUP_LABELS: Record<TestCaseCategory, string> = {
  happy_path: "Happy paths TC",
  negative: "Negative TC",
  edge: "Edge TC",
  regression: "Regression TC",
  reproduction: "Reproduction TC",
  other: "Other TC",
};

export const TEST_CASE_CATEGORY_ORDER: TestCaseCategory[] = [
  "happy_path",
  "negative",
  "edge",
  "regression",
  "reproduction",
  "other",
];

function normalizeCategory(category: string): TestCaseCategory {
  if (category in TEST_CASE_CATEGORY_LABELS) {
    return category as TestCaseCategory;
  }
  return "other";
}

export function groupTestCasesByCategory(
  testCases: QATestCase[]
): { category: TestCaseCategory; label: string; cases: QATestCase[] }[] {
  const buckets = new Map<TestCaseCategory, QATestCase[]>();

  for (const testCase of testCases) {
    const category = normalizeCategory(testCase.category);
    const list = buckets.get(category) ?? [];
    list.push(testCase);
    buckets.set(category, list);
  }

  return TEST_CASE_CATEGORY_ORDER.filter((category) => buckets.has(category)).map(
    (category) => ({
      category,
      label: TEST_CASE_GROUP_LABELS[category],
      cases: buckets.get(category) ?? [],
    })
  );
}

export function hasApiTestSuggestions(suggestions: string[]): boolean {
  if (suggestions.length === 0) {
    return false;
  }
  return !suggestions.every((item) => /^n\/a\b/i.test(item.trim()));
}
