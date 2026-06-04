import type {
  Scan,
  Website,
  DisclosedVendor,
  ObservedTag,
  Violation,
  ViolationSeverity,
  ViolationCategory,
  ScanStatus,
  ScanFrequency,
} from "@/generated/prisma/client";

export type {
  Scan,
  Website,
  DisclosedVendor,
  ObservedTag,
  Violation,
  ViolationSeverity,
  ViolationCategory,
  ScanStatus,
  ScanFrequency,
};

export type ScanWithRelations = Scan & {
  website: Website;
  disclosedVendors: DisclosedVendor[];
  observedTags: ObservedTag[];
  violations: Violation[];
};

export type WebsiteWithScans = Website & {
  scans: Scan[];
};

export interface ComplianceReport {
  healthScore: number;
  totalObservedTags: number;
  totalDisclosedVendors: number;
  totalViolations: number;
  violationsBySeverity: Record<ViolationSeverity, number>;
  undisclosedTrackers: string[];
  piiLeaks: Violation[];
}
