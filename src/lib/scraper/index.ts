export { identifyVendor, KNOWN_VENDORS } from "./vendor-patterns";
export type { VendorPattern } from "./vendor-patterns";
export { scanWebsite } from "./scanner";
export type { ScannerOptions } from "./scanner";
export { setupRequestCapture, identifyTags } from "./request-capture";
export { findPrivacyPolicyLink, extractPolicyText } from "./policy-extractor";
export type {
  CapturedRequest,
  IdentifiedTag,
  PrivacyPolicyResult,
  ScanResult,
} from "./types";
