"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import type { ScanWithRelations } from "@/types";

function severityColor(severity: string) {
  switch (severity) {
    case "HIGH":
      return "destructive";
    case "MEDIUM":
      return "default";
    case "LOW":
      return "secondary";
    default:
      return "outline";
  }
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
      <p className="text-muted-foreground py-12 text-center">
        Loading scan report...
      </p>
    );
  }

  if (!scan) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        Scan not found.
      </p>
    );
  }

  const disclosedNames = new Set(
    scan.disclosedVendors.map((v) => v.vendorName.toLowerCase())
  );
  const observedNames = [
    ...new Set(
      scan.observedTags
        .map((t) => t.vendorName)
        .filter((n): n is string => n !== null)
    ),
  ];
  const undisclosed = observedNames.filter(
    (name) => !disclosedNames.has(name.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scan Report</h1>
        <p className="text-muted-foreground mt-1">
          {scan.website.domain} &mdash;{" "}
          {new Date(scan.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {scan.healthScore ?? "—"}
              {scan.healthScore !== null && (
                <span className="text-lg text-muted-foreground">/100</span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Observed Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scan.observedTags.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Disclosed Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {scan.disclosedVendors.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {scan.violations.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="violations">
        <TabsList>
          <TabsTrigger value="violations">
            Violations ({scan.violations.length})
          </TabsTrigger>
          <TabsTrigger value="observed">
            Observed vs Disclosed
          </TabsTrigger>
          <TabsTrigger value="tags">All Observed Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Violations</CardTitle>
              <CardDescription>
                AI-detected issues requiring attention.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scan.violations.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  No violations detected. Run a scan to analyze compliance.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Remediation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scan.violations.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <Badge variant={severityColor(v.severity)}>
                            {v.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {v.category}
                        </TableCell>
                        <TableCell>{v.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {v.remediationSteps ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="observed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Observed vs Disclosed</CardTitle>
              <CardDescription>
                Comparing tags found on the site against the privacy policy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {undisclosed.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-destructive mb-2">
                      Undisclosed Trackers ({undisclosed.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {undisclosed.map((name) => (
                        <Badge key={name} variant="destructive">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold mb-2">
                    Disclosed Vendors ({scan.disclosedVendors.length})
                  </h4>
                  {scan.disclosedVendors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No vendor disclosures extracted yet.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Found on Site?</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scan.disclosedVendors.map((v) => {
                          const found = observedNames.some(
                            (n) =>
                              n.toLowerCase() === v.vendorName.toLowerCase()
                          );
                          return (
                            <TableRow key={v.id}>
                              <TableCell className="font-medium">
                                {v.vendorName}
                              </TableCell>
                              <TableCell>
                                {v.purposeExtracted ?? "—"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={found ? "default" : "secondary"}
                                >
                                  {found ? "Yes" : "Not detected"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Observed Tags</CardTitle>
              <CardDescription>
                Third-party network requests captured during the scan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scan.observedTags.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  No tags observed yet. Run a scan to capture network activity.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Type</TableHead>
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
                            {tag.vendorName ?? "Unknown"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {tag.hostname}
                          </TableCell>
                          <TableCell>{tag.resourceType ?? "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={disclosed ? "default" : "destructive"}
                            >
                              {disclosed ? "Yes" : "No"}
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
      </Tabs>
    </div>
  );
}
