import { queryLLM, safeParseJSON } from "./llm-client";
import { EXTRACT_VENDORS_SYSTEM } from "./prompts";

export interface ExtractedVendor {
  vendorName: string;
  purpose: string;
  dataTypes: string;
}

interface ExtractVendorsResult {
  vendors: ExtractedVendor[];
  generalDisclosures: string[];
}

export async function extractVendorsFromPolicy(
  policyText: string
): Promise<ExtractVendorsResult> {
  const userMessage = `Analyze the following privacy policy text and extract all disclosed third-party vendors:\n\n---\n${policyText}\n---`;

  const response = await queryLLM(EXTRACT_VENDORS_SYSTEM, userMessage);

  // The LLM may return either a top-level array or an object with vendors/generalDisclosures
  const parsed = safeParseJSON<
    | ExtractedVendor[]
    | { vendors?: ExtractedVendor[]; generalDisclosures?: string[] }
  >(response.content);

  if (!parsed) {
    return { vendors: [], generalDisclosures: [] };
  }

  if (Array.isArray(parsed)) {
    return { vendors: parsed, generalDisclosures: [] };
  }

  return {
    vendors: parsed.vendors ?? [],
    generalDisclosures: parsed.generalDisclosures ?? [],
  };
}
