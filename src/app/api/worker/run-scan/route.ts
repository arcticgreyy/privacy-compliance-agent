import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scanWebsite } from "@/lib/scraper/scanner";
import { identifyVendor } from "@/lib/scraper/vendor-patterns";
import { analyzeScan } from "@/lib/ai/analyze-scan";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scanId } = await request.json();
  if (!scanId) {
    return NextResponse.json(
      { error: "scanId is required" },
      { status: 400 }
    );
  }

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { website: true },
  });

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  await prisma.scan.update({
    where: { id: scanId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    // ── Step 1: Playwright scan ──────────────────────────────────────
    const result = await scanWebsite(scan.website.domain, {
      browserWSEndpoint: process.env.BROWSER_WS_ENDPOINT,
      timeout: 60_000,
    });

    // Persist observed third-party requests
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
        },
      };
    });

    await prisma.observedTag.createMany({ data: observedTagData });

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "ANALYZING",
        policyUrl: result.privacyPolicy?.url ?? null,
        policyTextHash: result.privacyPolicy
          ? Buffer.from(result.privacyPolicy.text.slice(0, 500)).toString(
              "base64"
            )
          : null,
      },
    });

    // ── Step 2: AI analysis ──────────────────────────────────────────
    const analysis = await analyzeScan(result);

    // Persist disclosed vendors
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

    // Persist violations
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

    // ── Step 3: Finalize ─────────────────────────────────────────────
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
      policyFound: !!result.privacyPolicy,
      errors: result.errors,
      timing: result.timing,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "FAILED",
        errorMessage: message,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
