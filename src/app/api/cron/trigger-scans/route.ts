import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dispatchScan } from "@/lib/queue";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const websites = await prisma.website.findMany({
    where: { isActive: true },
    include: {
      scans: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const dueWebsites = websites.filter((site) => {
    const lastScan = site.scans[0];
    if (!lastScan) return true;

    const lastScanDate = lastScan.createdAt;
    switch (site.scanFrequency) {
      case "DAILY":
        return lastScanDate < oneDayAgo;
      case "WEEKLY":
        return lastScanDate < oneWeekAgo;
      case "MONTHLY":
        return lastScanDate < oneMonthAgo;
    }
  });

  const results = await Promise.all(
    dueWebsites.map(async (site) => {
      const scan = await prisma.scan.create({
        data: { websiteId: site.id, status: "PENDING" },
      });

      const dispatch = await dispatchScan(scan.id);

      return {
        scanId: scan.id,
        websiteId: site.id,
        domain: site.domain,
        ...dispatch,
      };
    })
  );

  return NextResponse.json({
    triggered: results.length,
    results,
  });
}
