import { collectAnalysisHaystack } from "@/lib/evaluation/serialize-analysis";
import type { HardCheckCriterionResult, HardCheckResult } from "@/lib/evaluation/types";
import type { QAAnalysis } from "@/types/qa-analysis";

interface HardCheckCriterion {
  label: string;
  matches: (haystack: string) => boolean;
}

interface HardCheckRule {
  id: string;
  label: string;
  appliesTo: (requirement: string) => boolean;
  criteria: HardCheckCriterion[];
}

function normalizeRequirement(requirement: string): string {
  return requirement.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(haystack: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(haystack));
}

const HARD_CHECK_RULES: HardCheckRule[] = [
  {
    id: "password-reset-email",
    label: "Password reset via email",
    appliesTo: (requirement) => {
      const norm = normalizeRequirement(requirement);
      return (
        norm.includes("reset") &&
        norm.includes("password") &&
        (norm.includes("email") || norm.includes("mail"))
      );
    },
    criteria: [
      {
        label: "Valid email / happy path",
        matches: (h) =>
          includesAny(h, [/valid.{0,20}email/, /registered.{0,20}email/, /happy path/]),
      },
      {
        label: "Invalid or unregistered email",
        matches: (h) =>
          includesAny(h, [/invalid.{0,20}email/, /unregistered.{0,20}email/, /unknown.{0,20}email/]),
      },
      {
        label: "Empty or missing email",
        matches: (h) =>
          includesAny(h, [/empty.{0,20}email/, /blank.{0,20}email/, /missing.{0,20}email/]),
      },
      {
        label: "Expired reset link or token",
        matches: (h) =>
          includesAny(h, [/expir.{0,30}(link|token)/, /(link|token).{0,30}expir/]),
      },
      {
        label: "Reused reset link or token",
        matches: (h) =>
          includesAny(h, [/reus.{0,30}(link|token)/, /(link|token).{0,30}reus/]),
      },
    ],
  },
  {
    id: "image-upload-limit",
    label: "Image upload limit",
    appliesTo: (requirement) => {
      const norm = normalizeRequirement(requirement);
      return norm.includes("upload") && includesAny(norm, [/image/, /photo/, /picture/]);
    },
    criteria: [
      {
        label: "Upload at or under the limit",
        matches: (h) => includesAny(h, [/upload.{0,20}1.{0,10}image/, /maximum.{0,20}allowed/, /at limit/]),
      },
      {
        label: "Exceeding the upload limit",
        matches: (h) =>
          includesAny(h, [/exceed/, /over.{0,10}limit/, /upload.{0,20}6/, /too many/]),
      },
      {
        label: "Invalid file type",
        matches: (h) =>
          includesAny(h, [/invalid.{0,20}(file|type|format)/, /unsupported.{0,20}format/]),
      },
      {
        label: "Oversized file",
        matches: (h) =>
          includesAny(h, [/large.{0,20}file/, /file.{0,20}size/, /oversized/, /max.{0,20}size/]),
      },
    ],
  },
];

function evaluateRule(
  rule: HardCheckRule,
  haystack: string
): HardCheckResult {
  const criteria: HardCheckCriterionResult[] = rule.criteria.map((criterion) => ({
    label: criterion.label,
    passed: criterion.matches(haystack),
  }));

  return {
    ruleId: rule.id,
    ruleLabel: rule.label,
    passed: criteria.every((criterion) => criterion.passed),
    criteria,
  };
}

export function runHardChecks(
  requirement: string,
  analysis: QAAnalysis
): HardCheckResult[] {
  const haystack = collectAnalysisHaystack(analysis);
  return HARD_CHECK_RULES.filter((rule) => rule.appliesTo(requirement)).map((rule) =>
    evaluateRule(rule, haystack)
  );
}

export function countFailedHardCheckCriteria(hardChecks: HardCheckResult[]): number {
  return hardChecks.reduce(
    (count, check) => count + check.criteria.filter((criterion) => !criterion.passed).length,
    0
  );
}
