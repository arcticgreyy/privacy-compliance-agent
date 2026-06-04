"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HealthScoreRing } from "@/components/dashboard/health-score-ring";
import { ScanStatusBadge } from "@/components/dashboard/scan-status-badge";
import { SeverityBreakdown } from "@/components/dashboard/severity-breakdown";
import {
  ArrowLeft,
  ShieldAlert,
  Eye,
  FileText,
  AlertTriangle,
} from "lucide-react";
import type { ScanWithRelations } from "@/types";

function severityVariant(severity: string) {
  switch (severity) {
    case "HIGH":
      return "destructive" as const;
    case "MEDIUM":
      return "default" as const;
    case "LOW":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function categoryLabel(category: string): string {
  return category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ScanReportPage() {
  const params = useParams<{ scanId: string }>();
  const [scan, setScan] = useState<ScanWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScan() {
      const res = await fetch(`/api/scans/${params.scanId}`);
      if (res.ok) setScan(await res.json());
      setLoading(false);
    }
    fetchScan();
  }, [params.scanId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Loading scan report...</p>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground">Scan not found.</p>
        <Link href="/scans" className="text-primary hover:underline mt-2 text-sm">
          Back to Scan History
        </Link>
      </div>
    );
  }

  const disclosedNames = new Set(
    scan.disclosedVendors.map((v) => v.vendorName.toLowerCase())
  );
  const observedVendorNames = [
    ...new Set(
      scan.observedTags
        .map((t) => t.vendorName)
        .filter((n): n is string => n !== null)
    ),
  ];
  const undisclosed = observedVendorNames.filter(
    (name) => !disclosedNames.has(name.toLowerCase())
  );

  const highCount = scan.violations.filter((v) => v.severity === "HIGH").length;
  const medCount = scan.violations.filter((v) => v.severity === "MEDIUM").length;
  const lowCount = scan.violations.filter((v) => v.severity === "LOW").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/scans"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Scans
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {scan.website.domain}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <ScanStatusBadge status={scan.status} />
            <span className="text-sm text-muted-foreground">
              {new Date(scan.createdAt).toLocaleString()}
            </span>
            {scan.policyUrl && (
              <a
                href={scan.policyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <FileText className="h-3 w-3" />
                Privacy Policy
              </a>
            )}
          </div>
        </div>
      </div>

      {scan.errorMessage && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Scan Error</AlertTitle>
          <AlertDescription>{scan.errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Score + summary cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            <HealthScoreRing
              score={scan.healthScore}
              size={140}
              strokeWidth={12}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Observed Tags</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scan.observedTags.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              third-party requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Disclosed Vendors
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {scan.disclosedVendors.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              in privacy policy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Violations</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {scan.violations.length}
            </div>
            <div className="mt-2">
              <SeverityBreakdown high={highCount} medium={medCount} low={lowCount} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="violations">
        <TabsList>
          <TabsTrigger value="violations">
            Violations ({scan.violations.length})
          </TabsTrigger>
          <TabsTrigger value="comparison">
            Observed vs Disclosed
          </TabsTrigger>
          <TabsTrigger value="tags">
            All Tags ({scan.observedTags.length})
          </TabsTrigger>
        </TabsList>

        {/* Violations Tab */}
        <TabsContent value="violations" className="mt-4 space-y-3">
          {scan.violations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShieldAlert className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-semibold">No Violations Detected</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This scan found no compliance issues. Great job!
                </p>
              </CardContent>
            </Card>
          ) : (
            scan.violations.map((v) => (
              <Card key={v.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={severityVariant(v.severity)}>
                          {v.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {categoryLabel(v.category)}
                        </Badge>
                        {v.vendorName && (
                          <span className="text-sm font-medium">
                            {v.vendorName}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{v.description}</p>
                      {v.remediationSteps && (
                        <div className="rounded-md bg-muted/50 p-3 mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Remediation
                          </p>
                          <p className="text-sm">{v.remediationSteps}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="mt-4 space-y-4">
          {undisclosed.length > 0 && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>
                {undisclosed.length} Undisclosed Tracker
                {undisclosed.length !== 1 && "s"}
              </AlertTitle>
              <AlertDescription>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {undisclosed.map((name) => (
                    <Badge key={name} variant="destructive">
                      {name}
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Disclosed Vendors</CardTitle>
              <CardDescription>
                Vendors explicitly named in the privacy policy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scan.disclosedVendors.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {scan.policyUrl
                    ? "No specific vendor names were extracted from the privacy policy."
                    : "No privacy policy was found on the website."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Stated Purpose</TableHead>
                      <TableHead>Data Types</TableHead>
                      <TableHead>Detected on Site?</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scan.disclosedVendors.map((v) => {
                      const found = observedVendorNames.some(
                        (n) =>
                          n.toLowerCase() === v.vendorName.toLowerCase()
                      );
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">
                            {v.vendorName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {v.purposeExtracted ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {v.dataTypes ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={found ? "default" : "secondary"}>
                              {found ? "Yes" : "Not detected"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Tags Tab */}
        <TabsContent value="tags" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Observed Network Tags</CardTitle>
              <CardDescription>
                Third-party requests captured during the scan. Grouped by vendor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scan.observedTags.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  No third-party tags were observed during this scan.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Disclosed?</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scan.observedTags.map((tag) => {
                      const disclosed = tag.vendorName
                        ? disclosedNames.has(tag.vendorName.toLowerCase())
                        : false;
                      return (
                        <TableRow key={tag.id}>
                          <TableCell className="font-medium">
                            {tag.vendorName ?? (
                              <span className="text-muted-foreground italic">
                                Unknown
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate">
                            {tag.hostname}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {tag.resourceType ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {tag.method ?? "—"}
                          </TableCell>
                          <TableCell>
                            {tag.vendorName ? (
                              <Badge
                                variant={disclosed ? "default" : "destructive"}
                              >
                                {disclosed ? "Yes" : "No"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
