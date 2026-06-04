"use client";

import { useEffect, useState } from "react";
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
import { HealthScoreRing } from "@/components/dashboard/health-score-ring";
import { ScanStatusBadge } from "@/components/dashboard/scan-status-badge";
import { SeverityBreakdown } from "@/components/dashboard/severity-breakdown";
import { Globe, ScanSearch, ShieldAlert, Activity } from "lucide-react";

const DEMO_ORG_ID = "demo-org-001";

interface DashboardData {
  websiteCount: number;
  activeWebsites: number;
  totalScans: number;
  openViolations: number;
  avgHealthScore: number | null;
  violationsBySeverity: Record<string, number>;
  recentScans: {
    id: string;
    domain: string;
    status: string;
    healthScore: number | null;
    violationCount: number;
    observedTagCount: number;
    createdAt: string;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/dashboard?organizationId=${DEMO_ORG_ID}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const hasData = data && data.totalScans > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your privacy compliance across all web properties.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Websites</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : (data?.websiteCount ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.activeWebsites ?? 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <ScanSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : (data?.totalScans ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              across all websites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Violations</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? "..." : (data?.openViolations ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              detected across all scans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading
                ? "..."
                : data?.avgHealthScore != null
                  ? `${data.avgHealthScore}/100`
                  : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              average across recent scans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle row: health ring + severity */}
      {hasData && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Health</CardTitle>
              <CardDescription>
                Average health score across your most recent scans.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              <HealthScoreRing score={data.avgHealthScore} size={160} strokeWidth={14} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Violation Breakdown</CardTitle>
              <CardDescription>
                Distribution by severity level.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center py-4">
              <SeverityBreakdown
                high={data.violationsBySeverity["HIGH"] ?? 0}
                medium={data.violationsBySeverity["MEDIUM"] ?? 0}
                low={data.violationsBySeverity["LOW"] ?? 0}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent scans table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>
            Your latest compliance scan results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading...</p>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ScanSearch className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">No scans yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Add a website and trigger your first scan to see compliance
                results here.
              </p>
              <Link
                href="/websites"
                className="mt-4 text-sm text-primary hover:underline"
              >
                Go to Websites &rarr;
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Website</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Violations</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentScans.map((scan) => (
                  <TableRow key={scan.id}>
                    <TableCell className="font-medium">{scan.domain}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(scan.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <ScanStatusBadge status={scan.status} />
                    </TableCell>
                    <TableCell>
                      {scan.healthScore != null ? (
                        <span
                          className={
                            scan.healthScore >= 80
                              ? "text-emerald-600 font-semibold"
                              : scan.healthScore >= 60
                                ? "text-yellow-600 font-semibold"
                                : "text-red-600 font-semibold"
                          }
                        >
                          {scan.healthScore}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{scan.observedTagCount}</TableCell>
                    <TableCell>
                      {scan.violationCount > 0 ? (
                        <span className="text-destructive font-medium">
                          {scan.violationCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/scans/${scan.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        View &rarr;
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
