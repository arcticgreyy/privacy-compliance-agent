import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { identifyVendor } from "@/lib/scraper";
import type { ScanResult } from "@/lib/scraper/types";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scanId, result } = (await request.json()) as {
    scanId: string;
    result: ScanResult;
  };

  if (!scanId || !result) {
    return NextResponse.json(
      { error: "scanId and result are required" },
      { status: 400 }
    );
  }

  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  // Persist observed tags
  const observedTagData = result.thirdPartyRequests.map((req) => {
    const vendor = identifyVendor(req.hostname);
    return {
      scanId,
      url: req.url,
      hostname: req.hostname,
      vendorName: vendor?.name ?? null,
      resourceType: req.resourceType,
      method: req.method,
      queryParams: req.queryParams,
      postBody: req.postBody ? { raw: req.postBody } : undefined,
      rawPayloadJson: {
        queryParams: req.queryParams,
        postBody: req.postBody,
        headers: req.headers,
      },
    };
  });

  await prisma.observedTag.createMany({ data: observedTagData });

  // Update scan with policy info and mark as ANALYZING (AI step next)
  await prisma.scan.update({
    where: { id: scanId },
    data: {
      status: "ANALYZING",
      policyUrl: result.privacyPolicy?.url ?? null,
    },
  });

  // TODO: Phase 3 will trigger the AI analysis step here
  // For now, mark as completed
  await prisma.scan.update({
    where: { id: scanId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    observedTags: observedTagData.length,
  });
}
