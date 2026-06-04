export interface CapturedRequest {
  url: string;
  hostname: string;
  method: string;
  resourceType: string;
  queryParams: Record<string, string>;
  postBody: string | null;
  headers: Record<string, string>;
  initiator: string | null;
}

export interface IdentifiedTag extends CapturedRequest {
  vendorName: string;
  category: string;
}

export interface PrivacyPolicyResult {
  url: string;
  text: string;
}

export interface ScanResult {
  targetUrl: string;
  allRequests: CapturedRequest[];
  thirdPartyRequests: CapturedRequest[];
  identifiedTags: IdentifiedTag[];
  privacyPolicy: PrivacyPolicyResult | null;
  errors: string[];
  timing: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
}
