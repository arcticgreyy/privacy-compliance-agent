import { extractVendorsFromPolicy } from "./extract-vendors";
import { analyzePayloadsForPII } from "./analyze-payloads";
import { compareCompliance, type ComplianceViolation } from "./compare-compliance";
import { calculateHealthScore } from "./health-score";
import { identifyTags } from "@/lib/scraper/request-capture";
import type { ScanResult } from "@/lib/scraper/types";
import type { ExtractedVendor } from "./extract-vendors";
import type { PIIFinding } from "./analyze-payloads";

export interface AnalysisResult {
  disclosedVendors: ExtractedVendor[];
  generalDisclosures: string[];
  piiFindings: PIIFinding[];
  violations: ComplianceViolation[];
  healthScore: number;
}

export async function analyzeScan(
  scanResult: ScanResult
): Promise<AnalysisResult> {
  const identifiedTags = identifyTags(scanResult.thirdPartyRequests);

  // Run vendor extraction and PII analysis in parallel
  const [vendorResult, piiFindings] = await Promise.all([
    scanResult.privacyPolicy
      ? extractVendorsFromPolicy(scanResult.privacyPolicy.text)
      : Promise.resolve({ vendors: [], generalDisclosures: [] as string[] }),
    analyzePayloadsForPII(scanResult.thirdPartyRequests),
  ]);

  // Run compliance comparison using results from both chains
  const violations = await compareCompliance(
    vendorResult.vendors,
    identifiedTags,
    piiFindings
  );

  // Add PII findings as violations too
  for (const pii of piiFindings) {
    const alreadyReported = violations.some(
      (v) =>
        v.category === "PII_LEAKAGE" &&
        v.vendorName.toLowerCase() === pii.vendorName.toLowerCase()
    );

    if (!alreadyReported) {
      violations.push({
        category: "PII_LEAKAGE",
        severity: pii.severity,
        vendorName: pii.vendorName,
        description: `${pii.piiType} detected in request to ${pii.vendorName}: ${pii.explanation}`,
        remediationSteps: `Review the ${pii.vendorName} integration to ensure PII is not being transmitted. Check the parameter "${pii.evidence}" and either remove it or ensure proper consent is obtained.`,
      });
    }
  }

  const uniqueObservedVendors = new Set(
    identifiedTags.map((t) => t.vendorName)
  ).size;

  const healthScore = calculateHealthScore(
    violations,
    uniqueObservedVendors,
    vendorResult.vendors.length
  );

  return {
    disclosedVendors: vendorResult.vendors,
    generalDisclosures: vendorResult.generalDisclosures,
    piiFindings,
    violations,
    healthScore,
  };
}
