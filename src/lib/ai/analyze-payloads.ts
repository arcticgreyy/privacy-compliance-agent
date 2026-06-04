import { queryLLM, safeParseJSON } from "./llm-client";
import { ANALYZE_PAYLOADS_SYSTEM } from "./prompts";
import type { CapturedRequest } from "@/lib/scraper/types";

export interface PIIFinding {
  url: string;
  vendorName: string;
  piiType: string;
  evidence: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  explanation: string;
}

function summarizePayloads(requests: CapturedRequest[]): string {
  // Deduplicate by hostname and condense for token efficiency
  const byHost = new Map<string, CapturedRequest[]>();
  for (const req of requests) {
    const existing = byHost.get(req.hostname) ?? [];
    existing.push(req);
    byHost.set(req.hostname, existing);
  }

  const summaries: string[] = [];
  for (const [hostname, reqs] of byHost) {
    summaries.push(`\n## ${hostname} (${reqs.length} requests)`);

    // Send up to 5 sample requests per host to stay within token limits
    const samples = reqs.slice(0, 5);
    for (const req of samples) {
      summaries.push(`- ${req.method} ${req.url}`);

      const paramEntries = Object.entries(req.queryParams);
      if (paramEntries.length > 0) {
        summaries.push(
          `  Query params: ${paramEntries
            .map(([k, v]) => `${k}=${v.slice(0, 100)}`)
            .join("&")}`
        );
      }
      if (req.postBody) {
        summaries.push(
          `  POST body: ${req.postBody.slice(0, 500)}`
        );
      }
    }

    if (reqs.length > 5) {
      summaries.push(`  ... and ${reqs.length - 5} more requests`);
    }
  }

  return summaries.join("\n");
}

export async function analyzePayloadsForPII(
  requests: CapturedRequest[]
): Promise<PIIFinding[]> {
  if (requests.length === 0) return [];

  const userMessage = `Analyze the following network request payloads captured from a website homepage. Identify any PII leakage:\n\n---\n${summarizePayloads(requests)}\n---`;

  const response = await queryLLM(ANALYZE_PAYLOADS_SYSTEM, userMessage);

  const parsed = safeParseJSON<PIIFinding[] | { findings?: PIIFinding[] }>(
    response.content
  );

  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  return parsed.findings ?? [];
}
