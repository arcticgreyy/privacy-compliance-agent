import type { ComplianceViolation } from "./compare-compliance";

const SEVERITY_WEIGHTS: Record<string, number> = {
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
};

export function calculateHealthScore(
  violations: ComplianceViolation[],
  observedTagCount: number,
  disclosedVendorCount: number
): number {
  if (observedTagCount === 0) return 100;

  let score = 100;

  // Deduct for violations by severity
  for (const v of violations) {
    score -= SEVERITY_WEIGHTS[v.severity] ?? 5;
  }

  // Deduct for low disclosure ratio (observed but not disclosed)
  if (observedTagCount > 0 && disclosedVendorCount === 0) {
    score -= 20;
  } else if (observedTagCount > 0) {
    const ratio = disclosedVendorCount / observedTagCount;
    if (ratio < 0.5) score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
