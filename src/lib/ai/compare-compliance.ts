import { queryLLM, safeParseJSON } from "./llm-client";
import { COMPARE_COMPLIANCE_SYSTEM } from "./prompts";
import type { ExtractedVendor } from "./extract-vendors";
import type { IdentifiedTag } from "@/lib/scraper/types";
import type { PIIFinding } from "./analyze-payloads";

export interface ComplianceViolation {
  category:
    | "UNDISCLOSED_TRACKER"
    | "PII_LEAKAGE"
    | "UNDISCLOSED_DATA_SHARING"
    | "MISSING_CONSENT"
    | "POLICY_MISMATCH";
  severity: "HIGH" | "MEDIUM" | "LOW";
  vendorName: string;
  description: string;
  remediationSteps: string;
}

function buildComparisonInput(
  disclosedVendors: ExtractedVendor[],
  observedTags: IdentifiedTag[],
  piiFindings: PIIFinding[]
): string {
  const sections: string[] = [];

  sections.push("## Disclosed Vendors (from Privacy Policy)");
  if (disclosedVendors.length === 0) {
    sections.push("No vendors were disclosed in the privacy policy.");
  } else {
    for (const v of disclosedVendors) {
      sections.push(
        `- ${v.vendorName}: purpose="${v.purpose}", dataTypes="${v.dataTypes}"`
      );
    }
  }

  sections.push("\n## Observed Tracking Tags (from Network Capture)");
  // Deduplicate by vendor name
  const uniqueVendors = new Map<string, IdentifiedTag[]>();
  for (const tag of observedTags) {
    const existing = uniqueVendors.get(tag.vendorName) ?? [];
    existing.push(tag);
    uniqueVendors.set(tag.vendorName, existing);
  }

  if (uniqueVendors.size === 0) {
    sections.push("No known tracking tags were observed.");
  } else {
    for (const [vendor, tags] of uniqueVendors) {
      const sample = tags[0];
      sections.push(
        `- ${vendor} (${tags.length} requests, category: ${sample.category}, sample: ${sample.url.slice(0, 120)})`
      );
    }
  }

  if (piiFindings.length > 0) {
    sections.push("\n## PII Leakage Findings");
    for (const f of piiFindings) {
      sections.push(
        `- [${f.severity}] ${f.vendorName}: ${f.piiType} — ${f.explanation}`
      );
    }
  }

  return sections.join("\n");
}

export async function compareCompliance(
  disclosedVendors: ExtractedVendor[],
  observedTags: IdentifiedTag[],
  piiFindings: PIIFinding[]
): Promise<ComplianceViolation[]> {
  // First, generate rule-based violations for obvious cases
  const ruleBasedViolations = generateRuleBasedViolations(
    disclosedVendors,
    observedTags
  );

  const input = buildComparisonInput(
    disclosedVendors,
    observedTags,
    piiFindings
  );

  const userMessage = `Compare the disclosed vendors against observed tags and identify all compliance violations:\n\n---\n${input}\n---`;

  const response = await queryLLM(COMPARE_COMPLIANCE_SYSTEM, userMessage);

  const parsed = safeParseJSON<
    ComplianceViolation[] | { violations?: ComplianceViolation[] }
  >(response.content);

  let llmViolations: ComplianceViolation[] = [];
  if (parsed) {
    llmViolations = Array.isArray(parsed)
      ? parsed
      : (parsed.violations ?? []);
  }

  // Merge: use rule-based as base, add any LLM findings not already covered
  return deduplicateViolations([...ruleBasedViolations, ...llmViolations]);
}

function generateRuleBasedViolations(
  disclosedVendors: ExtractedVendor[],
  observedTags: IdentifiedTag[]
): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  const disclosedNamesLower = new Set(
    disclosedVendors.map((v) => v.vendorName.toLowerCase())
  );

  const observedVendorNames = [
    ...new Set(observedTags.map((t) => t.vendorName)),
  ];

  for (const vendorName of observedVendorNames) {
    if (!disclosedNamesLower.has(vendorName.toLowerCase())) {
      const tag = observedTags.find((t) => t.vendorName === vendorName)!;
      violations.push({
        category: "UNDISCLOSED_TRACKER",
        severity:
          tag.category === "Advertising" ? "HIGH" : "MEDIUM",
        vendorName,
        description: `${vendorName} (${tag.category}) was detected sending network requests but is not disclosed in the privacy policy.`,
        remediationSteps: `Either add ${vendorName} to your privacy policy with its purpose and data collection practices, or remove the ${vendorName} tag from your website.`,
      });
    }
  }

  return violations;
}

function deduplicateViolations(
  violations: ComplianceViolation[]
): ComplianceViolation[] {
  const seen = new Set<string>();
  const unique: ComplianceViolation[] = [];

  for (const v of violations) {
    const key = `${v.category}:${v.vendorName.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(v);
    }
  }

  return unique;
}
