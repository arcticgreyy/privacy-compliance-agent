"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { AddWebsiteDialog } from "@/components/websites/add-website-dialog";
import { ScanStatusBadge } from "@/components/dashboard/scan-status-badge";
import { Globe, Play, ExternalLink } from "lucide-react";
import type { WebsiteWithScans } from "@/types";

const DEMO_ORG_ID = "demo-org-001";

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<WebsiteWithScans[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);

  const fetchWebsites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/websites?organizationId=${DEMO_ORG_ID}`
      );
      if (res.ok) {
        setWebsites(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  async function triggerScan(websiteId: string) {
    setTriggering(websiteId);
    try {
      await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });
      await fetchWebsites();
    } finally {
      setTriggering(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Websites</h1>
          <p className="text-muted-foreground mt-1">
            Manage the domains you are monitoring for privacy compliance.
          </p>
        </div>
        <AddWebsiteDialog
          organizationId={DEMO_ORG_ID}
          onWebsiteAdded={fetchWebsites}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Domains</CardTitle>
          <CardDescription>
            {websites.length} website{websites.length !== 1 && "s"} monitored
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">
              Loading...
            </p>
          ) : websites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">No websites yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Click &quot;Add Website&quot; to register your first domain for
                privacy compliance monitoring.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Last Scan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {websites.map((site) => {
                  const lastScan = site.scans[0] as
                    | (typeof site.scans)[0] & { healthScore?: number | null }
                    | undefined;
                  return (
                    <TableRow key={site.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{site.domain}</span>
                          <a
                            href={`https://${site.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {site.scanFrequency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lastScan
                          ? new Date(lastScan.createdAt).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {lastScan ? (
                          <ScanStatusBadge status={lastScan.status} />
                        ) : (
                          <Badge variant="outline">No scans</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {lastScan?.healthScore != null ? (
                          <span
                            className={
                              lastScan.healthScore >= 80
                                ? "text-emerald-600 font-semibold"
                                : lastScan.healthScore >= 60
                                  ? "text-yellow-600 font-semibold"
                                  : "text-red-600 font-semibold"
                            }
                          >
                            {lastScan.healthScore}/100
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {lastScan && (
                            <Link
                              href={`/scans/${lastScan.id}`}
                              className="text-primary hover:underline text-sm"
                            >
                              Report
                            </Link>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={triggering === site.id}
                            onClick={() => triggerScan(site.id)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            {triggering === site.id ? "..." : "Scan"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
