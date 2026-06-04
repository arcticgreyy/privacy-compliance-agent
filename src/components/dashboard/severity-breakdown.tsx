"use client";

import { cn } from "@/lib/utils";

interface SeverityBreakdownProps {
  high: number;
  medium: number;
  low: number;
}

export function SeverityBreakdown({ high, medium, low }: SeverityBreakdownProps) {
  const total = high + medium + low;
  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">No violations detected</p>
    );
  }

  const segments = [
    { label: "High", count: high, color: "bg-red-500", textColor: "text-red-600" },
    { label: "Medium", count: medium, color: "bg-yellow-500", textColor: "text-yellow-600" },
    { label: "Low", count: low, color: "bg-blue-400", textColor: "text-blue-500" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {segments.map(
          (seg) =>
            seg.count > 0 && (
              <div
                key={seg.label}
                className={cn("h-full transition-all", seg.color)}
                style={{ width: `${(seg.count / total) * 100}%` }}
              />
            )
        )}
      </div>
      <div className="flex gap-4">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs">
            <div className={cn("h-2.5 w-2.5 rounded-full", seg.color)} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className={cn("font-semibold", seg.textColor)}>
              {seg.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
