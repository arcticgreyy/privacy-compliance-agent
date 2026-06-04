import type { Page, Request } from "playwright-core";
import type { CapturedRequest, IdentifiedTag } from "./types";
import { identifyVendor } from "./vendor-patterns";

function parseQueryParams(url: string): Record<string, string> {
  try {
    const parsed = new URL(url);
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function isThirdParty(requestHostname: string, siteHostname: string): boolean {
  const reqRoot = requestHostname.split(".").slice(-2).join(".");
  const siteRoot = siteHostname.split(".").slice(-2).join(".");
  return reqRoot !== siteRoot;
}

export function setupRequestCapture(
  page: Page,
  siteHostname: string
): { allRequests: CapturedRequest[]; thirdPartyRequests: CapturedRequest[] } {
  const allRequests: CapturedRequest[] = [];
  const thirdPartyRequests: CapturedRequest[] = [];

  page.on("request", (request: Request) => {
    const url = request.url();
    const hostname = getHostname(url);
    if (!hostname) return;

    const captured: CapturedRequest = {
      url,
      hostname,
      method: request.method(),
      resourceType: request.resourceType(),
      queryParams: parseQueryParams(url),
      postBody: request.postData() ?? null,
      headers: request.headers(),
      initiator: null,
    };

    allRequests.push(captured);

    if (isThirdParty(hostname, siteHostname)) {
      thirdPartyRequests.push(captured);
    }
  });

  return { allRequests, thirdPartyRequests };
}

export function identifyTags(
  thirdPartyRequests: CapturedRequest[]
): IdentifiedTag[] {
  const tags: IdentifiedTag[] = [];

  for (const req of thirdPartyRequests) {
    const vendor = identifyVendor(req.hostname);
    if (vendor) {
      tags.push({
        ...req,
        vendorName: vendor.name,
        category: vendor.category,
      });
    }
  }

  return tags;
}
