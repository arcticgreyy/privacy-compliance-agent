import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("organizationId");
  if (!orgId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    );
  }

  const websites = await prisma.website.findMany({
    where: { organizationId: orgId },
    include: {
      scans: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          _count: {
            select: { violations: true, observedTags: true },
          },
        },
      },
    },
  });

  const websiteCount = websites.length;
  const activeWebsites = websites.filter((w) => w.isActive).length;

  const recentScans = await prisma.scan.findMany({
    where: {
      website: { organizationId: orgId },
    },
    include: {
      website: { select: { domain: true } },
      _count: {
        select: { violations: true, observedTags: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const completedScans = recentScans.filter((s) => s.status === "COMPLETED");
  const totalScans = await prisma.scan.count({
    where: { website: { organizationId: orgId } },
  });

  const openViolations = await prisma.violation.count({
    where: { scan: { website: { organizationId: orgId } } },
  });

  const violationsBySeverity = await prisma.violation.groupBy({
    by: ["severity"],
    where: { scan: { website: { organizationId: orgId } } },
    _count: true,
  });

  const avgHealthScore =
    completedScans.length > 0
      ? Math.round(
          completedScans.reduce((sum, s) => sum + (s.healthScore ?? 0), 0) /
            completedScans.length
        )
      : null;

  return NextResponse.json({
    websiteCount,
    activeWebsites,
    totalScans,
    openViolations,
    avgHealthScore,
    violationsBySeverity: Object.fromEntries(
      violationsBySeverity.map((v) => [v.severity, v._count])
    ),
    recentScans: recentScans.map((s) => ({
      id: s.id,
      domain: s.website.domain,
      status: s.status,
      healthScore: s.healthScore,
      violationCount: s._count.violations,
      observedTagCount: s._count.observedTags,
      createdAt: s.createdAt,
    })),
  });
}
