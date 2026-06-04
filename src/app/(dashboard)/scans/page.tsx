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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScanSearch } from "lucide-react";
import type { Scan, Website, ViolationSeverity } from "@/types";

type ScanRow = Scan & {
  _count: {
    observedTags: number;
    disclosedVendors: number;
    violations: number;
  };
};

const DEMO_ORG_ID = "demo-org-001";

function statusColor(status: string) {
  switch (status) {
    case "COMPLETED":
      return "default";
    case "RUNNING":
    case "ANALYZING":
      return "secondary";
    case "FAILED":
      return "destructive";
    default:
      return "outline";
  }
}

export default function ScansPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>("all");
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/websites?organizationId=${DEMO_ORG_ID}`)
      .then((r) => r.json())
      .then(setWebsites);
  }, []);

  const fetchScans = useCallback(async () => {
    if (selectedWebsite === "all" && websites.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    if (selectedWebsite === "all") {
      const allScans = await Promise.all(
        websites.map((w) =>
          fetch(`/api/scans?websiteId=${w.id}`).then((r) => r.json())
        )
      );
      setScans(allScans.flat());
    } else {
      const res = await fetch(`/api/scans?websiteId=${selectedWebsite}`);
      setScans(await res.json());
    }
    setLoading(false);
  }, [selectedWebsite, websites]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scan Reports</h1>
          <p className="text-muted-foreground mt-1">
            View compliance scan history and results.
          </p>
        </div>
        <Select value={selectedWebsite} onValueChange={(v) => setSelectedWebsite(v ?? "all")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by website" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Websites</SelectItem>
            {websites.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.domain}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
          <CardDescription>
            {scans.length} scan{scans.length !== 1 && "s"} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">
              Loading...
            </p>
          ) : scans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ScanSearch className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">No scan history</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Trigger a scan from the Websites page to see results here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Violations</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scans.map((scan) => (
                  <TableRow key={scan.id}>
                    <TableCell>
                      {new Date(scan.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor(scan.status)}>
                        {scan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {scan.healthScore != null ? `${scan.healthScore}/100` : "—"}
                    </TableCell>
                    <TableCell>{scan._count.observedTags}</TableCell>
                    <TableCell>{scan._count.violations}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/scans/${scan.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        View Report &rarr;
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
