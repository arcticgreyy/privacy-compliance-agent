"use client";

import { cn } from "@/lib/utils";

interface HealthScoreRingProps {
  score: number | null;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function getScoreStroke(score: number): string {
  if (score >= 80) return "stroke-emerald-500";
  if (score >= 60) return "stroke-yellow-500";
  if (score >= 40) return "stroke-orange-500";
  return "stroke-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Poor";
  return "Critical";
}

export function HealthScoreRing({
  score,
  size = 120,
  strokeWidth = 10,
  className,
}: HealthScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score != null ? (score / 100) * circumference : 0;
  const offset = circumference - progress;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {score != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn("transition-all duration-1000 ease-out", getScoreStroke(score))}
          />
        )}
      </svg>
      <div className="absolute flex flex-col items-center">
        {score != null ? (
          <>
            <span className={cn("text-2xl font-bold", getScoreColor(score))}>
              {score}
            </span>
            <span className="text-xs text-muted-foreground">
              {getScoreLabel(score)}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">N/A</span>
        )}
      </div>
    </div>
  );
}
