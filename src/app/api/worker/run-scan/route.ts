import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scanWebsite } from "@/lib/scraper/scanner";

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
    const result = await scanWebsite(scan.website.domain, {
      browserWSEndpoint: process.env.BROWSER_WS_ENDPOINT,
      timeout: 60_000,
    });

    // Persist the observed third-party requests
    const { identifyVendor } = await import("@/lib/scraper/vendor-patterns");

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

    // TODO: Phase 3 — trigger AI analysis here
    // For now, mark complete
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      observedTags: observedTagData.length,
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
