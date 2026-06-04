import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { identifyVendor } from "@/lib/scraper";
import { analyzeScan } from "@/lib/ai/analyze-scan";
import type { ScanResult } from "@/lib/scraper/types";

export const maxDuration = 300;

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

  await prisma.scan.update({
    where: { id: scanId },
    data: {
      status: "ANALYZING",
      policyUrl: result.privacyPolicy?.url ?? null,
    },
  });

  // Run AI analysis
  const analysis = await analyzeScan(result);

  if (analysis.disclosedVendors.length > 0) {
    await prisma.disclosedVendor.createMany({
      data: analysis.disclosedVendors.map((v) => ({
        scanId,
        vendorName: v.vendorName,
        purposeExtracted: v.purpose,
        dataTypes: v.dataTypes,
      })),
    });
  }

  if (analysis.violations.length > 0) {
    await prisma.violation.createMany({
      data: analysis.violations.map((v) => ({
        scanId,
        severity: v.severity,
        category: v.category,
        description: v.description,
        remediationSteps: v.remediationSteps,
        vendorName: v.vendorName,
        evidence: v.description,
      })),
    });
  }

  await prisma.scan.update({
    where: { id: scanId },
    data: {
      status: "COMPLETED",
      healthScore: analysis.healthScore,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    observedTags: observedTagData.length,
    disclosedVendors: analysis.disclosedVendors.length,
    violations: analysis.violations.length,
    healthScore: analysis.healthScore,
  });
}
