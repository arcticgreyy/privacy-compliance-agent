"use client";

import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type Status = "PENDING" | "RUNNING" | "ANALYZING" | "COMPLETED" | "FAILED";

const STATUS_CONFIG: Record<
  Status,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Pending", variant: "outline" },
  RUNNING: { label: "Scanning", variant: "secondary" },
  ANALYZING: { label: "Analyzing", variant: "secondary" },
  COMPLETED: { label: "Completed", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
};

export function ScanStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as Status] ?? {
    label: status,
    variant: "outline" as const,
  };
  const isActive = status === "RUNNING" || status === "ANALYZING";

  return (
    <Badge variant={config.variant} className="gap-1">
      {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
      {config.label}
    </Badge>
  );
}
